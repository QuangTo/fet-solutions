const repo = require("../repository");
const { writeThrough } = require("../cache");
const { namedMasterSchema, vehicleSchema } = require("../validators");

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

function masterConfig(resource) {
  return masterConfigs[resource] || null;
}

function valueFromBody(config, body) {
  return body[config.column] || body.name;
}

function listMaster(resource) {
  const config = masterConfig(resource);
  return repo.listMaster(config.table, config.column);
}

function createMaster(resource, payload, user) {
  const config = masterConfig(resource);
  const body = config.schema.parse(payload);
  return writeThrough(() => repo.createNamedMaster({
    column: config.column,
    entityType: config.entityType,
    table: config.table,
    user,
    value: valueFromBody(config, body),
  }), ["master", "operations", "report"]);
}

function updateMaster(resource, id, payload, user) {
  const config = masterConfig(resource);
  const body = config.schema.parse(payload);
  return writeThrough(() => repo.updateNamedMaster({
    column: config.column,
    entityType: config.entityType,
    id,
    table: config.table,
    user,
    value: valueFromBody(config, body),
  }), ["master", "operations", "report"]);
}

function deleteMaster(resource, id, user) {
  const config = masterConfig(resource);
  return writeThrough(() => repo.softDeleteMaster({
    entityType: config.entityType,
    id,
    table: config.table,
    user,
  }), ["master", "operations", "report"]);
}

module.exports = {
  createMaster,
  deleteMaster,
  listMaster,
  masterConfig,
  masterConfigs,
  updateMaster,
};
