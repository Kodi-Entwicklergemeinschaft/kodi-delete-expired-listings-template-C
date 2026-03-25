async function updateExpiryDateForEvents(db) {
    const query = `UPDATE listings
                  SET expiryDate =
                      CASE
                          WHEN endDate IS NOT NULL THEN DATE_ADD(endDate, INTERVAL 1 DAY)
                          ELSE DATE_ADD(startDate, INTERVAL 1 DAY)
                      END
                  WHERE categoryId = 3 AND expiryDate IS NULL;`;

    try {
        await db.callQuery(query);
        console.log("Expiry dates updated successfully for events.");
    } catch (error) {
        console.error("Error updating expiry dates for events:", error);
    }
}

module.exports = { updateExpiryDateForEvents };
