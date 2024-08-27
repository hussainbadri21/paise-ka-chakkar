'use client'
import { Button, message, Upload, Table, Popconfirm, Typography } from 'antd';
import Image from "next/image";
import { UploadOutlined } from '@ant-design/icons';
import { useState } from "react";
import axios from 'axios';
import { exportToExcel } from 'react-json-to-excel';

const { Text } = Typography;

export default function Home() {
  const [gstFileList, setGstFileList] = useState([]);
  const [tallyFileList, setTallyFileList] = useState([]);
  const [tableData, setTableData] = useState([]);

  const props = {
    accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    onChange(info: any) {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const handleUpload = async () => {
    if (gstFileList.length === 0) {
      message.error('Please select a gst file first!');
      return;
    }

    if (tallyFileList.length === 0) {
      message.error('Please select a tally file first!');
      return;
    }

    const formData = new FormData();
    formData.append('tallyFile', tallyFileList[0]);
    formData.append('gstFile', gstFileList[0]);

    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.success('File uploaded and processed successfully!');
      console.log(response.data)
      setTableData(response.data);
    } catch (error) {
      message.error('Upload failed!');
      console.error('Error:', error);
    }
  };

  const localizeCurrency = (s) => s ? `₹ ${s.toLocaleString('en-IN')}` : '0'

  const tableSummary = data => {
    if (!data || data.length === 0)
      return null;
    console.log('assasa', data)
    let cgstTotal = data.reduce((total, item) => total + (typeof item.cgst !== 'undefined' ? item.cgst : 0), 0);
    let sgstTotal = data.reduce((total, item) => total + (typeof item.sgst !== 'undefined' ? item.sgst : 0), 0);
    let igstTotal = data.reduce((total, item) => total + (typeof item.igst !== 'undefined' ? item.igst : 0), 0);
    let taxableValueTotal = data.reduce((total, item) => total + (typeof item.tv !== 'undefined' ? item.tv : 0), 0);

    return (
      <>
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={4}>Total</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>
            <Text>{localizeCurrency(taxableValueTotal)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={2}>
            <Text>{localizeCurrency(igstTotal)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={3}>
            <Text>{localizeCurrency(sgstTotal)}</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4}>
            <Text>{localizeCurrency(cgstTotal)}</Text>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </>
    )
  }


  const columns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'GSTIN',
      dataIndex: 'gst',
      key: 'gst',
    },
    {
      title: 'Invoie No.',
      dataIndex: 'inv',
      key: 'inv',
    },
    {
      title: 'Invoie Date',
      dataIndex: 'inv_date',
      key: 'inv_date',
    },
    {
      title: 'Taxable Value',
      dataIndex: 'tv',
      key: 'tv',
      render: (_, record) => localizeCurrency(record.tv),
      sorter: (a, b) => b.tv - a.tv,
    },
    {
      title: 'IGST',
      dataIndex: 'igst',
      key: 'igst',
      render: (_, record) => localizeCurrency(record.igst),
    },
    {
      title: 'SGST',
      dataIndex: 'sgst',
      key: 'sgst',
      render: (_, record) => localizeCurrency(record.sgst),
    },
    {
      title: 'CGST',
      dataIndex: 'cgst',
      key: 'cgst',
      render: (_, record) => localizeCurrency(record.cgst),
    },

  ];

  const handleSendEmail = async (record) => {
    await axios.post('/send-mail', record);
    message.success(`Email successfully sent to ${record.gst}`)
  }

  const otherColumns = [...columns,
  {
    title: 'Reason',
    dataIndex: 'reason',
    key: 'reason',
    render: (_, record) => <div dangerouslySetInnerHTML={{ __html: record.reason }} />
  },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: (_, record) => <Popconfirm title={`Are you sure you want to send an email to ${record.gst}?`} onConfirm={() => handleSendEmail(record)}>
      <a>Send Email</a>
    </Popconfirm>
  },
  ]

  return (
    <div className='mx-10'>
      <main className="flex  flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">

          <Upload {...props} onRemove={(file) => {
            gstFileList([]);
          }}
            beforeUpload={(file) => {
              setGstFileList([file]);
              return false; // Prevent auto upload
            }}
            fileList={gstFileList}>
            <Button icon={<UploadOutlined />}>Click to Upload GST excel</Button>
          </Upload>
          <Upload {...props} onRemove={(file) => {
            tallyFileList([]);
          }}
            beforeUpload={(file) => {
              setTallyFileList([file]);
              return false; // Prevent auto upload
            }}
            fileList={tallyFileList}>
            <Button icon={<UploadOutlined />}>Click to Upload Tally excel</Button>
          </Upload>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={gstFileList.length === 0 || tallyFileList.length === 0}
            style={{ marginTop: 16 }}
          >
            Upload and Process
          </Button>
        </div >

      </main >
      <div className='flex justify-end'>
        <Button
          type="primary"
          onClick={() => exportToExcel([{
            sheetName: "Exact Matches",
            details: tableData.exact
          },
          {
            sheetName: "Approx Matches",
            details: tableData.approx
          },
          {
            sheetName: "Mismatch",
            details: tableData.mismatch
          },
          {
            sheetName: "Not Found",
            details: tableData.not_found
          },

          ], 'downloadfilename', true)}
          style={{ marginTop: 16 }}
        >
          Export Data
        </Button>
      </div>
      <>
        <div>Exact Match</div>
        {tableData && <Table summary={() => tableSummary(tableData.exact)} dataSource={tableData.exact} columns={columns} />}
      </>
      <>
        <div>Approx Match</div>
        {tableData && <Table summary={() => tableSummary(tableData.approx)} dataSource={tableData.approx} columns={otherColumns} />}
      </>
      <>
        <div>Mismatch</div>
        {tableData && <Table summary={() => tableSummary(tableData.mismatch)} dataSource={tableData.mismatch} columns={otherColumns} />}
      </>
      <>
        <div>Not Found</div>
        {tableData && <Table summary={() => tableSummary(tableData.not_found)} dataSource={tableData.not_found} columns={otherColumns} />}
      </>
    </div>
  );
}
