// DB Sheet Search Script
// Designed to filter records based on search text.
// Input via Context.argv:
// - sheet_name: (Optional) Name of the sheet to search. Defaults to active or first.
// - search_text: (Optional) Text to search for. If empty, returns all (limited).

function main() {
    const argv = Context.argv || {};
    const sheetName = argv.sheet_name;
    const searchText = argv.search_text || "";

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

        // Construct Filter
        // Note: Generic "Search all fields" is complex in DB Sheet API if we have to specify field.
        // If searchText is provided, we try to match against *any* text field or just iterate.
        // Application.Record.GetRecords supports a Filter object.

        // Strategy: If specific column search isn't supported easily across "all",
        // we might fetch a page and filter in memory, OR try to construct a complex OR filter.
        // For simplicity and "Quick Query" website, fetching recent records and filtering is often safer
        // if the API doesn't support "Any Field Contains X".
        // However, `getAllTablesInfo.js` example shows `criteria` with `field`.

        let records = [];

        // Fetch records (limit 200 for demo)
        const limit = 200;
        const result = Application.Record.GetRecords({
            SheetId: sheetId,
            MaxRecords: limit
        });

        let rawRecords = result.records;

        // In-memory filter for generic search (since building OR for all columns is verbose)
        if (searchText) {
            const lowerSearch = String(searchText).toLowerCase();
            records = rawRecords.filter(r => {
                // Check all properties of the record object
                // Record object keys are field IDs/Names
                return Object.values(r.fields || {}).some(val =>
                    String(val).toLowerCase().includes(lowerSearch)
                );
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
