// ...código previo...

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        startY: currentY,
        theme: 'grid',
        styles: {
            fontSize: 5,
            cellPadding: 1,
            lineColor: [200,200,200],
            lineWidth: 0.25,
            overflow: 'ellipsize',
            tableWidth: 'wrap'
        },
        headStyles: {
            fillColor: [226, 232, 240],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: 5,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
        },
        footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0,0,0],
            fontStyle: 'bold',
            fontSize: 5,
            cellPadding: 1,
            halign: 'right',
        },
        columnStyles: {
            0: { cellWidth: 45, fontStyle: 'bold', fontSize: 5 },
            1: { cellWidth: 25 },
            2: { cellWidth: 28, halign: 'right' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 28, halign: 'right' },
            5: { cellWidth: 24, halign: 'right' },
            6: { cellWidth: 24, halign: 'right' },
            7: { cellWidth: 24, halign: 'right' },
            8: { cellWidth: 24, halign: 'right' },
            9: { cellWidth: 24, halign: 'right' },
            10: { cellWidth: 24, halign: 'right' },
            11: { cellWidth: 24, halign: 'right' },
            12: { cellWidth: 24, halign: 'right' },
            13: { cellWidth: 24, halign: 'right' },
            14: { cellWidth: 24, halign: 'right' },
            15: { cellWidth: 24, halign: 'right' },
            16: { cellWidth: 24, halign: 'right' },
            17: { cellWidth: 24, halign: 'right' },
            18: { cellWidth: 24, halign: 'right' },
            19: { cellWidth: 32, halign: 'right' },
            20: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [76, 67, 223] },
            21: { cellWidth: 25, minCellHeight: firmaHeight },
        },
        didDrawPage: (hookData) => {
            currentY = hookData.cursor?.y ?? currentY;
            const pageNum = doc.internal.getNumberOfPages();
            addHeaderAndWatermark(doc, 10, true);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0);
        },
        didDrawCell: (data) => {
            if (data.column.index === 21 && data.cell.section === 'body') {
                const cell = data.cell;
                if (cell.raw === '') {
                    const signatureLineY = cell.y + cell.height - 5;
                    const signatureLineXStart = cell.x + 2;
                    const signatureLineXEnd = cell.x + cell.width - 2;
                    doc.setDrawColor(220, 220, 220);
                    doc.setLineWidth(0.5);
                    doc.line(signatureLineXStart, signatureLineY, signatureLineXEnd, signatureLineY);
                }
            }
        }
    });

// ...resto igual...