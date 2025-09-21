
import React, { useState, useRef } from 'react';
import { UploadIcon, FileIcon, TrashIcon } from './icons';

interface FileUploadProps {
  id: string;
  label: string;
  onFileChange: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ id, label, onFileChange }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      onFileChange(file);
    } else {
      // alert("Please select a PDF file.");
      handleRemoveFile();
    }
  };
  
  const handleRemoveFile = () => {
    setFileName(null);
    onFileChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
     if (file && file.type === "application/pdf") {
      setFileName(file.name);
      onFileChange(file);
    } else {
      // alert("Please drop a PDF file.");
      handleRemoveFile();
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {fileName ? (
        <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-slate-800 truncate" title={fileName}>{fileName}</span>
          </div>
          <button onClick={handleRemoveFile} className="p-1 text-slate-500 hover:text-red-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400">
            <TrashIcon className="h-5 w-5"/>
          </button>
        </div>
      ) : (
        <label
            htmlFor={id}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50"
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadIcon className="w-8 h-8 mb-3 text-slate-500"/>
                <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-slate-400">PDF only</p>
            </div>
            <input
              id={id}
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
        </label>
      )}
    </div>
  );
};
