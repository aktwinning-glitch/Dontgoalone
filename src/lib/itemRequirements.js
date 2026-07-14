// Item requirement checking for choices
export const checkItemRequirements = (inventory = [], requiredItemIds = []) => {
  if (!requiredItemIds || requiredItemIds.length === 0) return true;
  const inventoryIds = (inventory || []).map(item => item.id);
  return requiredItemIds.every(id => inventoryIds.includes(id));
};

export const getMissingItems = (inventory = [], requiredItemIds = []) => {
  if (!requiredItemIds || requiredItemIds.length === 0) return [];
  const inventoryIds = (inventory || []).map(item => item.id);
  return requiredItemIds.filter(id => !inventoryIds.includes(id));
};

export const getRequiredItemsDisplay = (inventory = [], requiredItemIds = [], itemDefs = {}) => {
  if (!requiredItemIds || requiredItemIds.length === 0) return [];
  return requiredItemIds.map(id => itemDefs[id] || { id, name: id });
};