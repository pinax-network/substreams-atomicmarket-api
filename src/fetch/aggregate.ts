import { makeQuery } from "../clickhouse/makeQuery.js";
import { logger } from "../logger.js";
import { store } from "../clickhouse/stores.js";
import { parseCollectionName } from "../utils.js";
import { getAggregate } from "../queries.js";
import * as prometheus from "../prometheus.js";
import { BadRequest, toJSON, toText } from "./cors.js";


export default async function (req: Request) {
  const parametersResult = await verifyParameters(req);
  if (parametersResult instanceof Response) {
    return parametersResult;
  }
  try {
    const { searchParams } = new URL(req.url);
    logger.info({searchParams: Object.fromEntries(Array.from(searchParams))});
    const query = await getAggregate(searchParams);
    const response = await makeQuery<number>(query)
    return toJSON(response.data);
  } catch (e: any) {
    logger.error(e);
    prometheus.request_error.inc({pathname: "/sales/aggregate", status: 400});
    return BadRequest
  }
}

async function verifyParameters(req: Request) {
  const url = new URL(req.url);
  const collection_name = url.searchParams.get("collection_name");
  if (collection_name && (parseCollectionName(collection_name) == undefined)) {
    return toText("Invalid EOSIO name type: collection_name=" + collection_name, 400);
  }
  else if (collection_name && !(await store.collection_names).includes(collection_name)) {
    return toText("Collection not found: " + collection_name, 404);
  }
}
