// Import necessary modules
import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import xlsx from 'node-xlsx';
import { tmpdir } from 'os';
var moment = require('moment');

const sanitizeString = (s) => typeof s === 'undefined' ? 0 : typeof s === 'number' ? Math.round(s) : typeof s === 'string' ? Math.round(parseFloat(s.replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, ''))) : s

const parseDate = (d) => typeof d === 'string' ? moment(d, 'DD/MM/YYYY').format('DD/MM/YYYY') : moment(d).format('DD/MM/YYYY');


export const POST = async (req, res) => {
    let exact = []
    let mismatch = []
    let not_found = []
    let approx = []

    // Parse the incoming form data
    const formData = await req.formData();

    // Get the file from the form data
    const tallyFile = formData.get("tallyFile");
    const gstFile = formData.get("gstFile");

    // Check if a file is received
    if (!tallyFile) {
        // If no file is received, return a JSON response with an error and a 400 status code
        return NextResponse.json({ error: "No tally File received." }, { status: 400 });
    }
    if (!gstFile) {
        // If no file is received, return a JSON response with an error and a 400 status code
        return NextResponse.json({ error: "No gst File received." }, { status: 400 });
    }
    // Convert the file data to a Buffer
    const tallyBuffer = Buffer.from(await tallyFile.arrayBuffer());
    const gstBuffer = Buffer.from(await gstFile.arrayBuffer());

    // Replace spaces in the file name with underscores
    const tallyFilename = tallyFile.name.replaceAll(" ", "_");
    const gstFilename = gstFile.name.replaceAll(" ", "_");

    try {
        const tallyFilePath = path.join(tmpdir(), tallyFilename);
        const gstFilePath = path.join(tmpdir(), gstFilename);

        // Write the file to the specified directory (public) with the modified filename
        await writeFile(
            tallyFilePath,
            tallyBuffer
        );
        await writeFile(
            gstFilePath,
            gstBuffer
        );

        // Parse the Excel file using node-xlsx
        const tallyWorksheet = xlsx.parse(tallyFilePath, { cellDates: true })?.[0]?.data;
        const gstWorksheet = xlsx.parse(gstFilePath, { cellDates: true })?.[0]?.data;

        let tallyData = {}
        let gstData = {};

        for (let i = 1; i < tallyWorksheet.length; i++) {
            tallyData[`${tallyWorksheet[i][5]}${tallyWorksheet[i][8]}`] = {
                gst: tallyWorksheet[i][5],
                inv: tallyWorksheet[i][8],
                tv: sanitizeString(tallyWorksheet[i][10]),
                igst: sanitizeString(tallyWorksheet[i][11]),
                cgst: sanitizeString(tallyWorksheet[i][12]),
                sgst: sanitizeString(tallyWorksheet[i][13]),
                name: tallyWorksheet[i][6],
                inv_date: parseDate(tallyWorksheet[i][9])
            }
        }

        for (let i = 1; i < gstWorksheet.length; i++) {
            if (gstWorksheet[i][17] === 'Yes' && gstWorksheet[i][8] === 'No') {
                gstData[`${gstWorksheet[i][1]}${gstWorksheet[i][3]}`] = {
                    gst: gstWorksheet[i][1],
                    inv: gstWorksheet[i][3],
                    tv: sanitizeString(gstWorksheet[i][10]),
                    igst: sanitizeString(gstWorksheet[i][11]),
                    cgst: sanitizeString(gstWorksheet[i][12]),
                    sgst: sanitizeString(gstWorksheet[i][13]),
                    name: gstWorksheet[i][2],
                    inv_date: parseDate(gstWorksheet[i][5])
                }
            }
        }

        let large, small, largeName, smallName;

        if (Object.keys(tallyData).length > Object.keys(gstData).length) {
            large = tallyData
            small = gstData
            largeName = "Books of Account"
            smallName = "GSTR 2B"
        }
        else {
            large = gstData
            small = tallyData
            largeName = "GSTR 2B"
            smallName = "Books of Account"
        }

        for (const key in large) {
            let largeValue = large[key]
            let smallValue = small[key]


            if (typeof smallValue !== 'undefined') {
                if (smallValue.gst == largeValue.gst && smallValue.inv == largeValue.inv) {
                    if ((smallValue.cgst == largeValue.cgst && smallValue.sgst == largeValue.sgst && smallValue.sgst != 0 && smallValue.cgst != 0) || (smallValue.igst == largeValue.igst && smallValue.igst != 0)) {
                        exact.push(largeValue)
                    }
                    else {
                        largeValue.reason = `Mismatch of :<br/>
                        ${smallValue.tv != largeValue.tv ? `Taxable Value: <b>${smallValue.tv}</b> in ${smallName} and <b>${largeValue.tv}</b> in ${largeName}<br/>` : ``}
                        ${typeof smallValue?.cgst !== 'undefined' && smallValue?.cgst != largeValue?.cgst ? `CGST: <b>${smallValue?.cgst}</b> in ${smallName} and <b>${largeValue?.cgst}</b> in ${largeName}<br/>` : ``}
                        ${typeof smallValue?.sgst !== 'undefined' && smallValue?.sgst != largeValue?.sgst ? `SGST: <b>${smallValue?.sgst}</b> in ${smallName} and <b>${largeValue?.sgst}</b> in ${largeName}<br/>` : ``}
                        ${typeof smallValue?.igst !== 'undefined' && smallValue?.igst != largeValue?.igst ? `IGST: <b>${smallValue?.igst}</b> in ${smallName} and <b>${largeValue?.igst}</b> in ${largeName}<br/>` : ``}`
                        mismatch.push(largeValue)
                    }
                    delete small[key]
                }
            }
            else {
                let f = Object.values(small).filter(x => x.gst == largeValue.gst && x.tv == largeValue.tv && x.inv_date === largeValue.inv_date && ((x.cgst == largeValue.cgst && x.sgst == largeValue.sgst && x.sgst != 0 && x.cgst != 0) || (x.igst == largeValue.igst && x.igst != 0)))
                if (f.length > 0) {
                    for (let i = 0; i < f.length; i++) {
                        let x = { ...f[i] }
                        x.reason = `Mismatch of :<br/> Invoice No : <b>${f[i].inv}</b> in ${smallName} and <b>${largeValue.inv}</b> in ${largeName}<br/>`;
                        approx.push(x)
                    }
                    delete small[key]
                    delete large[key]
                }
                else {
                    largeValue.reason = `Not found in ${smallName}`
                    not_found.push(largeValue)
                }

            }

        }
        for (const key in small) {
            let value = small[key]
            value.reason = `Not found in ${largeName}`
            not_found.push(value)
        }


        // Return a JSON response with a success message and a 201 status code
        return NextResponse.json({ Message: "Success", status: 201, exact, mismatch, approx, not_found });
    } catch (error) {
        // If an error occurs during file writing, log the error and return a JSON response with a failure message and a 500 status code
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};