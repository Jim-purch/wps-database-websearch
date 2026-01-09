/**
 * WPS多维表格 AirScript - 获取数据表信息与搜索功能
 * 
 * 通过webhook调用此脚本，可以：
 * 1. 获取文档中全部数据表的名称和列名称
 * 2. 通过指定列名称和值进行搜索，返回对应行的JSON数据
 * 
 * 使用方法：
 * 1. 将此脚本复制到WPS多维表格的"开发"功能中
 * 2. 生成脚本令牌(API Token)
 * 3. 通过HTTP POST请求调用webhook接口
 * 
 * 请求示例：
 * 
 * 获取全部表信息:
 * POST /api/v3/ide/file/:file_id/script/:script_id/sync_task
 * Body: {"Context":{"argv":{"action":"getAll"}}}
 * 
 * 按列搜索:
 * Body: {"Context":{"argv":{
 *   "action":"search",
 *   "sheetName":"表名",
 *   "columnName":"列名",
 *   "searchValue":"搜索值",
 *   "op":"Contains"
 * }}}
 */

/**
 * 获取全部数据表信息
 * @returns {Object} 包含所有表名和列信息的对象
 */
function getAllTablesInfo() {
    console.log("开始获取全部数据表信息...")

    try {
        // 获取所有表信息
        const sheets = Application.Sheet.GetSheets()

        if (!sheets || sheets.length === 0) {
            return {
                success: true,
                tables: [],
                message: "当前文档没有数据表"
            }
        }

        console.log(`找到 ${sheets.length} 个数据表`)

        const tables = []

        for (const sheet of sheets) {
            console.log(`处理数据表: ${sheet.name} (ID: ${sheet.id})`)

            // 获取表的字段描述信息
            const columns = []

            try {
                const fieldDescriptors = Application.Sheets(sheet.name).FieldDescriptors
                const fieldCount = fieldDescriptors.Count

                for (let i = 1; i <= fieldCount; i++) {
                    const field = fieldDescriptors.Item(i)
                    columns.push({
                        name: field.Name,
                        type: field.Type,
                        id: `@${field.Name}`
                    })
                }
            } catch (fieldError) {
                console.log(`获取表 ${sheet.name} 的字段信息失败: ${fieldError}`)
            }

            tables.push({
                name: sheet.name,
                id: sheet.id,
                columns: columns
            })
        }

        console.log("数据表信息获取完成")

        return {
            success: true,
            tables: tables
        }

    } catch (error) {
        console.error(`获取数据表信息失败: ${error}`)
        return {
            success: false,
            error: String(error),
            message: "获取数据表信息时发生错误"
        }
    }
}

/**
 * 按列搜索记录
 * @param {string} sheetName - 数据表名称
 * @param {string} columnName - 列名称
 * @param {string} searchValue - 搜索值
 * @param {string} op - 筛选操作符 (Equals, Contains, BeginWith, EndWith, NotEmpty, Empty)
 * @returns {Object} 包含匹配记录的对象
 */
function searchByColumn(sheetName, columnName, searchValue, op) {
    console.log(`开始搜索: 表=${sheetName}, 列=${columnName}, 值=${searchValue}, 操作=${op}`)

    // 参数验证
    if (!sheetName) {
        return {
            success: false,
            error: "缺少参数: sheetName",
            message: "请提供数据表名称"
        }
    }

    if (!columnName) {
        return {
            success: false,
            error: "缺少参数: columnName",
            message: "请提供列名称"
        }
    }

    // 默认操作符
    const opType = op || "Contains"

    // 验证操作符
    const validOps = ["Equals", "NotEqu", "Greater", "GreaterEqu", "Less", "LessEqu",
        "BeginWith", "EndWith", "Contains", "NotContains", "Intersected",
        "Empty", "NotEmpty"]
    if (!validOps.includes(opType)) {
        return {
            success: false,
            error: `无效的操作符: ${opType}`,
            message: `有效的操作符: ${validOps.join(", ")}`
        }
    }

    try {
        // 获取所有表信息以验证表名
        const sheets = Application.Sheet.GetSheets()
        const targetSheet = sheets.find(sheet => sheet.name === sheetName)

        if (!targetSheet) {
            return {
                success: false,
                error: `未找到数据表: ${sheetName}`,
                message: "请检查数据表名称是否正确",
                availableSheets: sheets.map(s => s.name)
            }
        }

        const sheetId = targetSheet.id

        // 构建筛选条件
        const filter = {
            "mode": "AND",
            "criteria": []
        }

        // Empty 和 NotEmpty 不需要 values
        if (opType === "Empty" || opType === "NotEmpty") {
            filter.criteria.push({
                "field": columnName,
                "op": opType
            })
        } else {
            if (!searchValue && searchValue !== 0) {
                return {
                    success: false,
                    error: "缺少参数: searchValue",
                    message: "请提供搜索值 (除 Empty/NotEmpty 操作外)"
                }
            }
            filter.criteria.push({
                "field": columnName,
                "op": opType,
                "values": [String(searchValue)]
            })
        }

        console.log(`筛选条件: ${JSON.stringify(filter)}`)

        // 分页查询所有匹配记录
        let allRecords = []
        let offset = null
        let pageCount = 0

        do {
            pageCount++
            console.log(`正在查询第 ${pageCount} 页...`)

            const pageResult = Application.Record.GetRecords({
                SheetId: sheetId,
                Offset: offset,
                Filter: filter
            })

            allRecords = allRecords.concat(pageResult.records)
            offset = pageResult.offset

            console.log(`第 ${pageCount} 页获取到 ${pageResult.records.length} 条记录，累计 ${allRecords.length} 条`)

        } while (offset)

        console.log(`搜索完成，共找到 ${allRecords.length} 条匹配记录`)

        return {
            success: true,
            sheetName: sheetName,
            columnName: columnName,
            searchValue: searchValue,
            op: opType,
            totalCount: allRecords.length,
            // 使用 JSON.parse(JSON.stringify()) 确保正确序列化
            records: JSON.parse(JSON.stringify(allRecords))
        }

    } catch (error) {
        console.error(`搜索失败: ${error}`)
        return {
            success: false,
            error: String(error),
            message: "搜索时发生错误"
        }
    }
}

/**
 * 获取指定数据表的详细信息（包含列定义和示例数据）
 * @param {string} sheetName - 数据表名称
 * @param {number} sampleSize - 示例数据行数（默认5）
 * @returns {Object} 表详情
 */
function getTableDetails(sheetName, sampleSize) {
    console.log(`获取数据表详情: ${sheetName}`)

    if (!sheetName) {
        return {
            success: false,
            error: "缺少参数: sheetName",
            message: "请提供数据表名称"
        }
    }

    try {
        const sheets = Application.Sheet.GetSheets()
        const targetSheet = sheets.find(sheet => sheet.name === sheetName)

        if (!targetSheet) {
            return {
                success: false,
                error: `未找到数据表: ${sheetName}`,
                availableSheets: sheets.map(s => s.name)
            }
        }

        // 获取列信息
        const columns = []
        const fieldDescriptors = Application.Sheets(sheetName).FieldDescriptors
        const fieldCount = fieldDescriptors.Count

        for (let i = 1; i <= fieldCount; i++) {
            const field = fieldDescriptors.Item(i)
            columns.push({
                name: field.Name,
                type: field.Type,
                id: `@${field.Name}`
            })
        }

        // 获取示例数据
        const limit = Math.min(Math.max(1, sampleSize || 5), 20)
        console.log("请求示例数据, limit=" + limit + ", sheetId=" + targetSheet.id)

        const sampleRecords = Application.Record.GetRecords({
            SheetId: targetSheet.id,
            MaxRecords: limit
        })

        console.log("获取到 " + sampleRecords.records.length + " 条示例记录")

        // 调试：打印第一条记录的内容
        if (sampleRecords.records.length > 0) {
            console.log("第一条记录: " + JSON.stringify(sampleRecords.records[0]))
        }

        return {
            success: true,
            table: {
                name: sheetName,
                id: targetSheet.id,
                columnCount: columns.length,
                columns: columns
            },
            sampleData: {
                count: sampleRecords.records.length,
                // 使用 JSON.parse(JSON.stringify()) 确保正确序列化
                records: JSON.parse(JSON.stringify(sampleRecords.records))
            }
        }

    } catch (error) {
        console.error(`获取表详情失败: ${error}`)
        return {
            success: false,
            error: String(error)
        }
    }
}

// ========== 主执行逻辑 ==========
console.log("=== AirScript 数据表API ===")

// 获取传入的参数
var argv = Context.argv || {}
var action = argv.action || "getAll"

console.log("执行操作: " + action)
console.log("参数: " + JSON.stringify(argv))

var result

if (action === "getAll") {
    result = getAllTablesInfo()
} else if (action === "search") {
    result = searchByColumn(argv.sheetName, argv.columnName, argv.searchValue, argv.op)
} else if (action === "details") {
    result = getTableDetails(argv.sheetName, argv.sampleSize)
} else {
    result = {
        success: false,
        error: "未知操作: " + action,
        message: "支持的操作: getAll, search, details"
    }
}

console.log("操作完成: " + (result.success ? "成功" : "失败"))

// 分段输出JSON以避免日志截断
var jsonOutput = JSON.stringify(result)
var chunkSize = 800
var totalChunks = Math.ceil(jsonOutput.length / chunkSize)

console.log("__JSON_START__:" + totalChunks)
for (var i = 0; i < totalChunks; i++) {
    console.log("__JSON_CHUNK_" + i + "__:" + jsonOutput.substr(i * chunkSize, chunkSize))
}
console.log("__JSON_END__")

// 最后一行表达式作为返回值
JSON.stringify(result, null, 2)
