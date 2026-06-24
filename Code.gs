function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Ali-GAS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
function doPost(e) {
  try {
    const res = JSON.parse(e.postData.contents);
    const data = res.data;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Ali-SS.csv") || ss.getSheets()[0];

    const lastRow = sheet.getLastRow();
    
    // 기존 시트 전체 데이터 읽기 (A열~K열)
    const existingRows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, 11).getValues() : [];
    
    // orderId -> { rowNum: number, values: any[] } 매핑 구축
    const existingOrdersMap = new Map();
    existingRows.forEach((row, index) => {
      const orderId = String(row[7]).trim(); // H열 (index 7)
      if (orderId) {
        existingOrdersMap.set(orderId, {
          rowNum: index + 1,
          values: row
        });
      }
    });

    const newRowsToInsert = [];
    let updatedCount = 0;
    const updatedRowNumbers = [];

    // 2. 중복 검사 및 업데이트 여부 판단
    data.forEach((incomingRow) => {
      const orderId = String(incomingRow[7]).trim(); // H열 (index 7)
      const orderDate = String(incomingRow[10]).trim(); // K열 (index 10)
      
      // 제품 정보가 아닌 헤더/로그 행들은 orderId가 없음 -> 신규 행으로 분류하여 그룹에 삽입
      if (!orderId) {
        // 단, 동일한 헤더가 이미 시트에 있으면 중복 추가 방지 (A열, B열 등으로 단순 비교)
        const isDuplicateHeader = existingRows.some(
          (row) =>
            String(row[0]).trim() === String(incomingRow[0]).trim() &&
            String(row[1]).trim() === String(incomingRow[1]).trim() &&
            String(row[10]).trim() === orderDate,
        );
        if (!isDuplicateHeader) {
          newRowsToInsert.push(incomingRow);
        }
        return;
      }

      if (existingOrdersMap.has(orderId)) {
        // 중복 존재 -> C열(index 2)부터 K열(index 10)까지 값 비교 후 다르면 업데이트
        const existing = existingOrdersMap.get(orderId);
        let hasDiff = false;
        for (let colIdx = 2; colIdx <= 10; colIdx++) {
          if (String(incomingRow[colIdx]).trim() !== String(existing.values[colIdx]).trim()) {
            hasDiff = true;
            break;
          }
        }

        if (hasDiff) {
          // 변경사항 업데이트 (C열~K열)
          const targetUpdateRange = sheet.getRange(existing.rowNum, 3, 1, 9);
          const updateData = incomingRow.slice(2, 11);
          targetUpdateRange.setValues([updateData]);
          updatedRowNumbers.push(existing.rowNum);
          updatedCount++;
        }
      } else {
        // 중복 없음 -> 신규 삽입 대상
        newRowsToInsert.push(incomingRow);
      }
    });

    // 3. 동일한 dateKey를 가진 제품들끼리 묶어서 저장 (Grouping)
    let insertedCount = 0;
    const affectedOrderDates = new Set();
    
    if (updatedCount > 0) {
      // 업데이트된 주문의 orderDate도 이름 정의 갱신 대상에 추가
      updatedRowNumbers.forEach(rowNum => {
        const oDate = String(sheet.getRange(rowNum, 11).getValue()).trim();
        if (oDate) {
          affectedOrderDates.add(oDate);
        }
      });
    }

    if (newRowsToInsert.length > 0) {
      insertedCount = newRowsToInsert.length;
      
      // 삽입하려는 행들을 orderDate 기준으로 나눔
      const rowsByOrderDate = {};
      newRowsToInsert.forEach(row => {
        const oDate = row[10];
        if (!rowsByOrderDate[oDate]) {
          rowsByOrderDate[oDate] = [];
        }
        rowsByOrderDate[oDate].push(row);
        affectedOrderDates.add(oDate);
      });

      // 각 orderDate 그룹별로 순차적으로 알맞은 위치에 삽입
      for (const oDate in rowsByOrderDate) {
        const groupRows = rowsByOrderDate[oDate];
        const groupSize = groupRows.length;
        
        // 현재 시트 상태에서 이 orderDate를 가진 가장 마지막 행 번호 찾기
        const currentRefRows = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, sheet.getLastRow(), 11).getValues() : [];
        let lastRowOfSameOrderDate = -1;
        for (let i = currentRefRows.length - 1; i >= 0; i--) {
          if (String(currentRefRows[i][10]).trim() === oDate) {
            lastRowOfSameOrderDate = i + 1;
            break;
          }
        }

        let insertStartRow;
        if (lastRowOfSameOrderDate !== -1) {
          insertStartRow = lastRowOfSameOrderDate + 1;
          sheet.insertRowsAfter(lastRowOfSameOrderDate, groupSize);
        } else {
          insertStartRow = sheet.getLastRow() + 1;
        }

        const targetRange = sheet.getRange(insertStartRow, 1, groupSize, 11);
        targetRange.setValues(groupRows);
      }
    }

    // 변경 및 추가가 모두 없다면 종료
    if (updatedCount === 0 && insertedCount === 0) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "success",
          message: "변경되거나 추가된 항목이 없습니다.",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. 영향받은 모든 orderDate에 대해 이름 정의 범위 및 스타일 재지정
    const refreshedRows = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, sheet.getLastRow(), 11).getValues() : [];
    
    affectedOrderDates.forEach(oDate => {
      let firstRowIndex = -1;
      let countOfRows = 0;

      for (let i = 0; i < refreshedRows.length; i++) {
        if (String(refreshedRows[i][10]).trim() === oDate) {
          if (firstRowIndex === -1) {
            firstRowIndex = i + 1;
          }
          countOfRows++;
        }
      }

      if (firstRowIndex !== -1 && countOfRows > 0) {
        const productRange = sheet.getRange(firstRowIndex, 3, countOfRows, 9);
        ss.setNamedRange("Ali_" + oDate, productRange);
        applyTableBorder(productRange);
        applyPriceStyles(sheet, firstRowIndex, countOfRows);
      }
    });

    // 업데이트된 기존 행들에 대한 개별 스타일 리프레시
    updatedRowNumbers.forEach((rowNum) => {
      const rowRange = sheet.getRange(rowNum, 3, 1, 9);
      applyTableBorder(rowRange);
      applyPriceStyles(sheet, rowNum, 1);
    });

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        insertedCount: insertedCount,
        updatedCount: updatedCount,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
