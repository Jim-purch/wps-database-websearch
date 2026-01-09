// Smart Sheet (Excel) Search Script
// Input:
// - sheet_name: (Optional) Name of the worksheet.
// - search_text: (Optional) Text to filter by.

function main() {
    const argv = Context.argv || {};
    const sheetName = argv.sheet_name;
    const searchText = argv.search_text || "";

    try {
        let sheet;
        if (sheetName) {
            try {
                sheet = Application.Worksheets.Item(sheetName);
            } catch (e) {
                return { success: false, error: "Sheet not found: " + sheetName };
            }
        } else {
            sheet = Application.ActiveSheet;
        }

        const usedRange = sheet.UsedRange;
        // Optimization: For very large sheets, Value might be slow. Limit range?
        // For quick search demo, we assume < 1000 rows.
        const values = usedRange.Value;
        // values is a 2D array: row 1 is header.

        if (!values || values.length === 0) {
            return { success: true, records: [] };
        }

        const headers = values[0].map(h => String(h));
        const dataRows = values.slice(1);

        let results = [];

        // In-memory filter
        if (searchText) {
            const lowerSearch = String(searchText).toLowerCase();
            results = dataRows.filter(row => {
                return row.some(cell => String(cell).toLowerCase().includes(lowerSearch));
            });
        } else {
            results = dataRows.slice(0, 200); // Limit return
        }

        // Map to objects
        const mappedResults = results.map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        });

        return {
            success: true,
            sheet: sheet.Name,
            columns: headers,
            records: mappedResults
        };

    } catch (e) {
        return { success: false, error: String(e) };
    }
}

main();
