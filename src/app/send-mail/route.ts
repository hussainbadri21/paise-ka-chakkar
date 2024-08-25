const nodemailer = require("nodemailer");
import { NextResponse } from "next/server";

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'irma.wuckert74@ethereal.email',
        pass: 'TuWkkqSUDDRnGsHGGj'
    }
});

export const POST = async (req, res) => {
    const data = await req.json();

    try {
        await transporter.sendMail({
            from: '"Vasooli Bhai 👻"', // sender address
            to: "hussain.c@peopleinteractive.in", // list of receivers
            subject: "Kya hua tera wada? 😢", // Subject line
            html: `Hi<br/>There are some anomalies in Invoice No : <b>${data.inv}</b> for GSTIN <b>${data.gst}</b><br/>${data.reason}<br/>Can you please take a look and resolve it at the earliest.`, // html body
        });
        return NextResponse.json({ Message: "Email sent successfully", status: 200 });

    } catch (error) {
        // If an error occurs during file writing, log the error and return a JSON response with a failure message and a 500 status code
        console.log("Error occurred ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};