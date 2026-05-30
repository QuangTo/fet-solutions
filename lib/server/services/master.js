import repo from "../repository.js";
import { namedMasterSchema, vehicleSchema } from "../validators.js";

const masterConfigs = {
  customers: {
    column: "name",
    entityType: "customer",
    schema: namedMasterSchema,
    table: "customers",
  },
  drivers: {
    column: "name",
    entityType: "driver",
    schema: namedMasterSchema,
    table: "drivers",
  },
  vehicles: {
    column: "plate",
    entityType: "vehicle",
    schema: vehicleSchema,
    table: "vehicles",
  },
};

function valueFromBody(config, body) {
  return body[config.column] || body.name;
}

function listMaster(config, user) {
  return repo.listMaster(config.table, config.column, user.siteId);
}

async function createMaster(config, body, user) {
  const parsed = config.schema.parse(body);
  return repo.createNamedMaster({
    column: config.column,
    entityType: config.entityType,
    table: config.table,
    user,
    value: valueFromBody(config, parsed),
  });
}

async function updateMaster(config, id, body, user) {
  const parsed = config.schema.parse(body);
  return repo.updateNamedMaster({
    column: config.column,
    entityType: config.entityType,
    id,
    table: config.table,
    user,
    value: valueFromBody(config, parsed),
  });
}

function deleteMaster(config, id, user) {
  return repo.softDeleteMaster({
    entityType: config.entityType,
    id,
    table: config.table,
    user,
  });
}

export {
  createMaster,
  deleteMaster,
  listMaster,
  masterConfigs,
  updateMaster,
  valueFromBody,
};

export default {
  createMaster,
  deleteMaster,
  listMaster,
  masterConfigs,
  updateMaster,
  valueFromBody,
};
