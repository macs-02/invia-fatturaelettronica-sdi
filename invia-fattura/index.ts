import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as soap from "soap";
import { FileSdiBaseType, SdiWebServiceResponse } from "./models/fatturaElettronicaModel";
import { HttpStatusCode } from "./models/httpStatusCodeModel";
import path = require("path");
import fs = require('fs/promises');

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    context.log("HTTP trigger function processed a request.");

    const wsdlFile = path.join(__dirname, "SdiRiceviFile_v1.0.wsdl");
    const pfx = await fs.readFile(path.join(__dirname, "SDI-01383140082-CLIENT.pfx"));

    const nomeFattura = path.basename(path.join(__dirname, "IT01234567890_FPR01.xml"));

    const fileSdiBaseType: FileSdiBaseType = {
      NomeFile: nomeFattura,
      File: await readFileAsBase64(nomeFattura),
    }

    const result = await inviaFatturaElettronicaToSdi(pfx, fileSdiBaseType, wsdlFile);

    context.res = {
      status: HttpStatusCode.Success,
      body: result
    };
  } catch (error) {
    console.error("Errore imprevisto durante l'invio della fattura elettronica", error);

    context.res = {
      status: HttpStatusCode.BadRequest,
      body: error
    }
  }
};

async function inviaFatturaElettronicaToSdi(pfx: Buffer, fileSdiBaseType: FileSdiBaseType, wsdl: string) {
  const client = await soap.createClientAsync(wsdl);
  client.setSecurity(new soap.ClientSSLSecurityPFX(pfx, "fabio"));

  const result = await client.RiceviFileAsync(fileSdiBaseType);

  return <SdiWebServiceResponse>result[0];
}

const readFileAsBase64 = async (nomeFile: string) => Buffer.from(await fs.readFile(path.join(__dirname, nomeFile))).toString('base64');

export default httpTrigger;
