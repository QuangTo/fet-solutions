export function prependToPaginatedList(list, item) {
  if (!list) {
    return { items: [item], page: 1, pageCount: 1, pageSize: 1, total: 1 };
  }
  if (Array.isArray(list)) {
    return prependById(list, item);
  }
  const items = prependById(list.items || [], item);
  return {
    ...list,
    items,
    total: (list.total || items.length - 1) + 1,
  };
}

export function prependById(rows = [], item) {
  if (!item?.id) return rows;
  return [item, ...rows.filter((row) => row.id !== item.id)];
}

export function upsertById(rows = [], item) {
  if (!item?.id) return rows;
  const exists = rows.some((row) => row.id === item.id);
  const nextRows = exists
    ? rows.map((row) => (row.id === item.id ? { ...row, ...item } : row))
    : [...rows, item];
  return nextRows.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
}

export function normalizeMasterItem(item, listName) {
  const label =
    item?.label ||
    item?.name ||
    item?.plate ||
    (item?.name && item?.code ? `${item.name} (${item.code})` : "");
  return {
    code: item?.code,
    createdAt: item?.createdAt || item?.created_at,
    id: item?.id,
    isActive: item?.isActive ?? item?.is_active ?? true,
    label,
    name: item?.name,
    updatedAt:
      item?.updatedAt ||
      item?.updated_at ||
      item?.createdAt ||
      item?.created_at,
  };
}

export function masterListFromPath(path = "") {
  return path.split("/").filter(Boolean)[0];
}

export function addMasterRecord(master, listName, item) {
  const normalized = normalizeMasterItem(item, listName);
  if (!normalized.id || !normalized.label) return master;
  return {
    ...master,
    [listName]: upsertById(master?.[listName] || [], normalized),
  };
}

export function removeMasterRecord(master, listName, id) {
  return {
    ...master,
    [listName]: (master?.[listName] || []).filter((item) => item.id !== id),
  };
}

export function applyReceiptInventory(inventory = [], receipt) {
  let nextInventory = inventory;
  (receipt.items || []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    let touched = false;
    nextInventory = nextInventory.map((row) => {
      const sameCustomer =
        row.customerId === receipt.customerId ||
        row.customer === receipt.customer;
      if (!sameCustomer || row.sku !== item.sku) return row;
      touched = true;
      return {
        ...row,
        currentPeriodOnly: true,
        receivedQuantity: Number(row.receivedQuantity || 0) + quantity,
        remainingQuantity: Number(row.remainingQuantity || 0) + quantity,
        unit: item.unit || row.unit,
      };
    });
    if (!touched) {
      nextInventory = [
        ...nextInventory,
        {
          currentPeriodOnly: true,
          customer: receipt.customer,
          customerId: receipt.customerId,
          dispatchedQuantity: 0,
          receivedQuantity: quantity,
          remainingQuantity: quantity,
          sku: item.sku,
          unit: item.unit || "đơn vị",
        },
      ];
    }
  });
  return nextInventory;
}

export function applyDispatchInventory(inventory = [], dispatch) {
  let nextInventory = inventory;
  (dispatch.items || []).forEach((item) => {
    const quantity = Number(item.quantity || 0);
    nextInventory = nextInventory.map((row) => {
      const sameCustomer =
        row.customerId === dispatch.customerId ||
        row.customer === dispatch.customer;
      if (!sameCustomer || row.sku !== item.sku) return row;
      return {
        ...row,
        currentPeriodOnly: true,
        dispatchedQuantity: Number(row.dispatchedQuantity || 0) + quantity,
        remainingQuantity: Math.max(
          Number(row.remainingQuantity || 0) - quantity,
          0,
        ),
      };
    });
  });
  return nextInventory;
}

export function receiptMasterRecord(receipt) {
  return {
    createdAt: receipt.createdAt,
    id: receipt.customerId,
    label: receipt.customer,
    updatedAt: receipt.createdAt,
  };
}

export function dispatchMasterRecords(dispatch) {
  return {
    customer: {
      createdAt: dispatch.createdAt,
      id: dispatch.customerId,
      label: dispatch.customer,
      updatedAt: dispatch.createdAt,
    },
    driver: {
      createdAt: dispatch.createdAt,
      id: dispatch.driverId,
      label: dispatch.driver,
      updatedAt: dispatch.createdAt,
    },
    vehicle: {
      createdAt: dispatch.createdAt,
      id: dispatch.vehicleId,
      label: dispatch.plate,
      updatedAt: dispatch.createdAt,
    },
  };
}

export function resetCustomerInventory(data, customerId, customerName = "") {
  if (!data) return data;
  return {
    ...data,
    inventory: (data.inventory || []).filter(
      (row) =>
        row.customerId !== customerId &&
        (!customerName || row.customer !== customerName),
    ),
    inventoryCurrentPeriodOnly: true,
  };
}
