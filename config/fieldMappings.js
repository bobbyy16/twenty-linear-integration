export const twentyFieldMappings = {
  id: "id",
  name: "name",
  amount: "amount",
  createdBy: "createdBy",
  closeDate: "closeDate",
  companyId: "company",
  pointOfContactId: "pointOfContact",

  linearProjectId: "linearprojectid",
  projectProgress: "projectprogress",
  deliveryStatus: "deliverystatus",
  stage: "stage",
  syncStatus: "syncstatus",
};

export const stageValues = {
  NEW: "NEW",
  SCREENING: "SCREENING",
  MEETING: "MEETING",
  PROPOSAL: "PROPOSAL",
  CLOSED_WON: "CLOSED_WON",
};

export const deliveryStatusValues = {
  INITIATED: "INITIATED",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export const syncStatusValues = {
  SYNCED: "SYNCED",
  PENDING: "PENDING",
  ERROR: "ERROR",
};

export const linearToTwentyDeliveryMap = {
  backlog: deliveryStatusValues.INITIATED,
  planned: deliveryStatusValues.INITIATED,
  "in progress": deliveryStatusValues.IN_PROGRESS,
  completed: deliveryStatusValues.DELIVERED,
  canceled: deliveryStatusValues.CANCELLED,
};

export const linearProgressByState = {
  backlog: 0,
  planned: 10,
  "in progress": 40,
  completed: 100,
  canceled: 0,
};
