const { Database } = require("utils-heidi");
const tables = require("./constants/tableNames");
const imageDeleteMultiple = require("./imageDeleteMultiple");
const { deleteMultiple } = require("./imageDeleteAsync");
const { updateExpiryDateForEvents } = require("./updateExpiryDateForEvents");

async function processInput(input, service) {
  let log = await service.startProcess(input.id);
  if (log) {
    try {
      const parsedInput = JSON.parse(input.input);
      await deleteListings(log.logId, parsedInput, service);
    } catch (err) {
      await service. endProcess(log.logId, err.stack, null, true);
    } finally {
      return true;
    }
  } else {
    return false;
  }
}

async function deleteListings(logId, input, service) {
  const dateNow = new Date().toISOString().slice(0, 19).replace("T", " ");
  let db = new Database(
    process.env.DATABASE_HOST,
    process.env.DATABASE_USER,
    process.env.DATABASE_PASSWORD,
    process.env.DATABASE_NAME,
    process.env.DATABASE_PORT
  );
  if (!input.cityId && parseInt(input.cityId)) {
    await service.endProcess(
      logId,
      null,
      {message: "Invalid input: The param cityIds is not present"},
      true
    );
    return false;
  }
  var response = await db.get(tables.CITIES, null, [
    { key: "id", value: input.cityId, sign: "=" },
  ]);

  if (response && response.rows && response.rows.length == 0) {
    await service.endProcess(
      logId,
      null,
      {message: "Invalid input: The cities given are not present"},
      true
    );
    return false;
  }

  await updateExpiryDateForEvents(db);

  const categoriesToDelete = JSON.parse(process.env.CATEGORIES_TO_DELETE);
  const categoriesToDeleteForSQL = categoriesToDelete.join(',');
  const category1Days = parseInt(process.env.DELETE_AFTER_DAYS || '60', 10);
  const quesry = `SELECT li.id as imageId, l.id as listingId, logo
  FROM heidi_core.listing_images li
  INNER JOIN heidi_core.listings l
  ON li.listingId = l.id
  WHERE (
    (l.categoryId = 1 AND COALESCE(l.expiryDate, l.endDate, l.startDate) < DATE_SUB('${dateNow}', INTERVAL ${category1Days} DAY))
    OR 
    (l.categoryId != 1 AND l.expiryDate < '${dateNow}' AND l.categoryId IN (${categoriesToDeleteForSQL}))
  )`

  const expiredListings = await db.callQuery(quesry);

  if (expiredListings.rows.length !== 0) {
    console.log(`Deleting ${expiredListings.rows.length} listings`);
    const deleteImages = expiredListings.rows
        .map((listing) => listing.logo)
        .filter(
            (logo) =>
                logo && typeof logo === "string" && logo.startsWith("user")
        );
    await deleteMultiple(deleteImages);
    await db.deleteData(tables.LISTING_IMAGES, null, [
      { key: "id", value: expiredListings.rows.map((listing) => listing.imageId), sign: "IN" },
    ]);
    // Split the deletion into two parts: category 1 (older-than threshold) and other categories (expired)
    // Delete category 1 listings that are older than the configured threshold using expiryDate -> endDate -> startDate
    await db.callQuery(`
      DELETE l, li 
      FROM ${tables.LISTINGS} l
      LEFT JOIN ${tables.LISTING_IMAGES} li ON l.id = li.listingId
      WHERE l.categoryId = 1 
      AND COALESCE(l.expiryDate, l.endDate, l.startDate) < DATE_SUB(?, INTERVAL ${category1Days} DAY)
    `, [dateNow]);
    
    // Delete other expired categories
    await db.deleteData(tables.LISTINGS, null, [
      { key: "expiryDate", value: dateNow, sign: "<" },
      { key: "categoryId", value: 1, sign: "!=" },
      { key: "categoryId", value: categoriesToDelete, sign: "IN" }
    ]);
    await service.endProcess(logId, null, { message: `Deleted ${expiredListings.rows.length} listings` });
  } else {
    await service.endProcess(logId, null, { message: 'No listings are to be deleted' });
  }
}

module.exports = {
  processInput,
};