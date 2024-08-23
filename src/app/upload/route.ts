// Import necessary modules
import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import xlsx from 'node-xlsx';

// Define the POST handler for the file upload
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

    console.log(tallyFilename, gstFilename);

    try {
        const tallyFilePath = path.join(process.cwd(), "public/" + tallyFilename);
        const gstFilePath = path.join(process.cwd(), "public/" + gstFilename);


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
        const tallyWorksheet = xlsx.parse(tallyFilePath)?.[0]?.data;
        const gstWorksheet = xlsx.parse(gstFilePath)?.[0]?.data;

        let tallyData = {}
        let gstData = {};

        for (let i = 1; i < tallyWorksheet.length; i++) {
            tallyData[`${tallyWorksheet[i][5]}${tallyWorksheet[i][8]}`] = {
                gst: tallyWorksheet[i][5],
                inv: tallyWorksheet[i][8],
                tv: tallyWorksheet[i][10],
                igst: tallyWorksheet[i][11],
                cgst: tallyWorksheet[i][12],
                sgst: tallyWorksheet[i][13],
            }
        }

        for (let i = 1; i < gstWorksheet.length; i++) {
            gstData[`${gstWorksheet[i][1]}${gstWorksheet[i][3]}`] = {
                gst: gstWorksheet[i][1],
                inv: gstWorksheet[i][3],
                tv: gstWorksheet[i][9],
                igst: gstWorksheet[i][10],
                cgst: gstWorksheet[i][11],
                sgst: gstWorksheet[i][12],
            }
        }

        const large = Object.keys(tallyData).length > Object.keys(gstData).length ? tallyData : gstData;
        const small = Object.keys(tallyData).length < Object.keys(gstData).length ? tallyData : gstData;


        for (const key in large) {
            let largeValue = large[key]
            let smallValue = small[key]


            if (typeof smallValue !== 'undefined') {
                if (smallValue.gst == largeValue.gst && smallValue.inv == largeValue.inv) {
                    if ((smallValue.cgst == largeValue.cgst && smallValue.sgst == largeValue.sgst) || smallValue.igst == largeValue.igst) {
                        exact.push(largeValue)
                    }
                    else {
                        mismatch.push(largeValue)
                    }
                    delete small[key]
                }
            }
            else {
                let f = Object.values(small).filter(x => x.gst == largeValue.gst && x.tv == largeValue.tv && ((x.cgst == largeValue.cgst && x.sgst == largeValue.sgst) || x.igst == largeValue.igst))
                if (f.length > 0) {
                    for (let i = 0; i < f.length; i++) {
                        approx.push(f[i])
                    }
                }
                else {
                    not_found.push(largeValue)
                }

            }

        }


        // Return a JSON response with a success message and a 201 status code
        return NextResponse.json({ Message: "Success", status: 201, exact, mismatch, approx, not_found });
    } catch (error) {
        // If an error occurs during file writing, log the error and return a JSON response with a failure message and a 500 status code
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};