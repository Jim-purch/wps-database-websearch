// DB Sheet Search Script
// Context.argv:
// - sheet_name: (Optional)
// - search_text: (Optional)
// - field_name: (Optional) If provided, search only this field.
// - get_columns: (Boolean) If true, return columns only.

function main() {
    const argv = Context.argv || {};
    const sheetName = argv.sheet_name;
    const searchText = argv.search_text || "";
    const fieldName = argv.field_name || "";
    const getColumns = argv.get_columns === true || argv.get_columns === "true";

    // Determine Sheet ID
    let sheetId = null;
    let sheetNameActual = sheetName;

    try {
        const sheets = Application.Sheet.GetSheets();
        if (sheetName) {
            const targetSheet = sheets.find(s => s.name === sheetName);
            if (targetSheet) {
                sheetId = targetSheet.id;
            } else {
                return { success: false, error: "Sheet not found: " + sheetName };
            }
        } else {
            // Default to first sheet if not specified
            if (sheets.length > 0) {
                sheetId = sheets[0].id;
                sheetNameActual = sheets[0].name;
            } else {
                return { success: false, error: "No sheets found in document" };
            }
        }

        // Get Columns (Fields) for context
        const columns = [];
        try {
            const fieldDescriptors = Application.Sheets(sheetNameActual).FieldDescriptors;
            for (let i = 1; i <= fieldDescriptors.Count; i++) {
                const field = fieldDescriptors.Item(i);
                columns.push({ name: field.Name, type: field.Type });
            }
        } catch (e) {
            console.log("Error getting fields: " + e);
        }

        if (getColumns) {
            return {
                success: true,
                sheet: sheetNameActual,
                columns: columns,
                records: []
            };
        }

        let records = [];

        // Fetch records (limit 200 for demo)
        const limit = 200;
        const result = Application.Record.GetRecords({
            SheetId: sheetId,
            MaxRecords: limit
        });

        let rawRecords = result.records;

        if (searchText) {
            const lowerSearch = String(searchText).toLowerCase();
            records = rawRecords.filter(r => {
                const fields = r.fields || {};

                if (fieldName) {
                    // Search specific field
                    // DB Sheet API usually maps field names to IDs or Names in the record object
                    // We assume `fields` keys are Field Names for simplicity in this wrapper,
                    // OR we check if the key matches the fieldName.
                    // Note: In real DB Sheet, keys might be IDs.
                    // But `getAllTablesInfo.js` implied generic access.
                    // We try to match key by name.
                    const val = fields[fieldName];
                    if (val !== undefined && val !== null) {
                        return String(val).toLowerCase().includes(lowerSearch);
                    }
                    return false;
                } else {
                    // Search all
                    return Object.values(fields).some(val =>
                        String(val).toLowerCase().includes(lowerSearch)
                    );
                }
            });
        } else {
            records = rawRecords;
        }

        // Clean up records for return
        const cleanedRecords = records.map(r => r.fields);

        return {
            success: true,
            sheet: sheetNameActual,
            columns: columns,
            records: cleanedRecords
        };

    } catch (e) {
        return { success: false, error: String(e) };
    }
}

main();
