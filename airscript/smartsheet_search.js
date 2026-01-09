// Smart Sheet (Excel) Search Script
// Input:
// - sheet_name: (Optional)
// - search_text: (Optional)
// - field_name: (Optional)
// - get_columns: (Boolean)

function main() {
    const argv = Context.argv || {};
    const sheetName = argv.sheet_name;
    const searchText = argv.search_text || "";
    const fieldName = argv.field_name || "";
    const getColumns = argv.get_columns === true || argv.get_columns === "true";

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
        const values = usedRange.Value;
        // values is a 2D array: row 1 is header.

        if (!values || values.length === 0) {
            return { success: true, records: [], columns: [] };
        }

        const headers = values[0].map(h => String(h));

        if (getColumns) {
             return {
                success: true,
                sheet: sheet.Name,
                columns: headers.map(h => ({ name: h })),
                records: []
            };
        }

        const dataRows = values.slice(1);

        let results = [];

        // Find index of field if provided
        let colIndex = -1;
        if (fieldName) {
            colIndex = headers.indexOf(fieldName);
        }

        if (searchText) {
            const lowerSearch = String(searchText).toLowerCase();
            results = dataRows.filter(row => {
                if (colIndex > -1) {
                    const cell = row[colIndex];
                    return String(cell).toLowerCase().includes(lowerSearch);
                } else {
                    return row.some(cell => String(cell).toLowerCase().includes(lowerSearch));
                }
            });
        } else {
            results = dataRows.slice(0, 200);
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
            columns: headers.map(h => ({ name: h })),
            records: mappedResults
        };

    } catch (e) {
        return { success: false, error: String(e) };
    }
}

main();
