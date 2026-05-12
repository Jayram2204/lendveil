import { readFileSync } from "node:fs";
import { join } from "node:path";

type AllowlistEntry = {
  name: string;
  public_key: string;
  schemas_issued: string[];
  trusted: boolean;
  added_date: string;
  documentation: string;
};

type IssuerAllowlist = {
  issuers: AllowlistEntry[];
};

const allowlistPath = join(process.cwd(), "../../config/ISSUER_ALLOWLIST.json");
const issuerAllowlist = JSON.parse(
  readFileSync(allowlistPath, "utf8")
) as IssuerAllowlist;

export const findTrustedIssuer = (issuerName: string, schema: string) => {
  return issuerAllowlist.issuers.find(
    (issuer) =>
      issuer.trusted &&
      issuer.name === issuerName &&
      issuer.schemas_issued.includes(schema)
  );
};
