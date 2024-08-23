'use client'
import { Button, message, Upload, Table, Popconfirm } from 'antd';
import Image from "next/image";
import { UploadOutlined } from '@ant-design/icons';
import { useState } from "react";
import axios from 'axios';
import { exportToExcel } from 'react-json-to-excel';


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

  const handleDownload = () => {
  }

  const columns = [
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
      title: 'Taxable Value',
      dataIndex: 'tv',
      key: 'tv',
    },
    {
      title: 'IGST',
      dataIndex: 'igst',
      key: 'igst',
    },
    {
      title: 'SGST',
      dataIndex: 'sgst',
      key: 'sgst',
    },
    {
      title: 'CGST',
      dataIndex: 'cgst',
      key: 'cgst',
    },

  ];

  const handleSendEmail = (record) => {
    setTimeout(() => message.success(`Email successfully sen to ${record.gst}`), 1000
    )
  }

  const otherColumns = [...columns, {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: (_, record) => <Popconfirm title={`Are you sure you want to send an email to ${record.gst}?`} onConfirm={() => handleSendEmail(record)}>
      <a>Send Email</a>
    </Popconfirm>
  },]

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
        {tableData && <Table dataSource={tableData.exact} columns={columns} />}
      </>
      <>
        <div>Approx Match</div>
        {tableData && <Table dataSource={tableData.approx} columns={otherColumns} />}
      </>
      <>
        <div>Mismatch</div>
        {tableData && <Table dataSource={tableData.mismatch} columns={otherColumns} />}
      </>
      <>
        <div>Not Found</div>
        {tableData && <Table dataSource={tableData.not_found} columns={otherColumns} />}
      </>
    </div>
  );
}
