import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  FileText,
  Download,
  ArrowRight,
  Database,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import { uploadProjectData, commitProjectRecordsBatch } from '../services/api';
import { ValidationResult } from '../types';

export type JobState =
  | 'IDLE'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR';

export const DataUpload: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dataSource, setDataSource] = useState<string>('Official Data');
  const [validating, setValidating] = useState<boolean>(false);
  const [jobState, setJobState] = useState<JobState>('IDLE');
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [processedRecords, setProcessedRecords] = useState<number>(0);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [updatedCount, setUpdatedCount] = useState<number>(0);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [batches, setBatches] = useState<any[][]>([]);
  const [failedBatchIndex, setFailedBatchIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importId, setImportId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewPageSize, setPreviewPageSize] = useState<number>(10);
  const activeUploadIdRef = useRef<number>(0);

  const sampleCSVTemplate = `project_code,project_name,sector,ministry,implementing_agency,state,original_cost,revised_cost,expenditure,physical_progress,financial_progress,original_completion_date,revised_completion_date
PRAGATI-NH48-CORR,Six-Lane Highway Expansion (Surat-Mumbai NH-48),Highways,Ministry of Road Transport and Highways,NHAI,Gujarat,4200,5350,3900,45.0,72.8,2025-12-31,2027-03-31
PRAGATI-IR-EDFC,Eastern Dedicated Freight Corridor (Sonnagar-Dankuni),Railways,Ministry of Railways,DFCCIL,West Bengal,12500,16800,14100,62.0,83.9,2024-12-31,2026-11-30
PRAGATI-DMRC-PH4,Delhi Metro Phase 4 (Aerocity Corridor),Metro Rail,Ministry of Housing and Urban Affairs,DMRC,Delhi-NCR,9500,10200,6800,52.0,66.6,2026-06-30,2027-08-31
PRAGATI-SECI-SOLAR,750 MW Pavagada Solar Grid Interconnection,Renewable Energy,Ministry of New and Renewable Energy,SECI,Karnataka,3100,3180,2950,88.0,92.7,2026-05-31,2026-07-31
PRAGATI-JJM-WATER,Rural Piped Drinking Water Pipeline Mission,Urban Water & Sanitation,Ministry of Jal Shakti,National Jal Jeevan Mission,Rajasthan,1850,2300,1650,38.0,71.7,2025-09-30,2026-12-31`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCSVTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'pragati_sample_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetJobState = () => {
    setJobState('IDLE');
    setTotalRecords(0);
    setProcessedRecords(0);
    setImportedCount(0);
    setUpdatedCount(0);
    setCurrentBatchIndex(0);
    setTotalBatches(0);
    setBatches([]);
    setFailedBatchIndex(null);
    setErrorMessage(null);
    setImportId('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setValidationResult(null);
      setUploadError(null);
      setCommitError(null);
      resetJobState();
      setPreviewPage(1);
      validateFile(selected, dataSource);
    }
    e.target.value = '';
  };

  const validateFile = async (targetFile: File, source: string) => {
    const uploadId = ++activeUploadIdRef.current;

    setUploadError(null);
    setCommitError(null);
    setValidating(true);
    setPreviewPage(1);

    try {
      const res = await uploadProjectData({ file: targetFile }, false, source);
      if (uploadId !== activeUploadIdRef.current) return;

      if (res && res.validation && typeof res.validation.valid_rows === 'number') {
        setUploadError(null);
        setCommitError(null);
        setValidationResult(res.validation);
      } else {
        throw new Error('Response is malformed.');
      }
    } catch (err: any) {
      if (uploadId !== activeUploadIdRef.current) return;
      setUploadError(err.message || 'Failed to upload file');
      setValidationResult(null);
    } finally {
      if (uploadId === activeUploadIdRef.current) {
        setValidating(false);
      }
    }
  };

  const handleLoadSampleQuick = async () => {
    const uploadId = ++activeUploadIdRef.current;
    setFile(null);
    setValidationResult(null);
    setUploadError(null);
    setCommitError(null);
    resetJobState();
    setPreviewPage(1);
    setValidating(true);

    try {
      const res = await uploadProjectData({ csv_text: sampleCSVTemplate }, false, 'Official Data');
      if (uploadId !== activeUploadIdRef.current) return;

      if (res && res.validation && typeof res.validation.valid_rows === 'number') {
        setUploadError(null);
        setCommitError(null);
        setValidationResult(res.validation);
      } else {
        throw new Error('Response is malformed.');
      }
    } catch (err: any) {
      if (uploadId !== activeUploadIdRef.current) return;
      setUploadError(err.message || 'Failed to load sample dataset');
      setValidationResult(null);
    } finally {
      if (uploadId === activeUploadIdRef.current) {
        setValidating(false);
      }
    }
  };

  const runBatchQueue = async (
    startIndex: number,
    chunksToRun: any[][],
    totalCount: number,
    idOfImport: string,
    initialImported: number,
    initialUpdated: number
  ) => {
    setJobState('PROCESSING');
    let curImported = initialImported;
    let curUpdated = initialUpdated;
    let curProcessed = 0;
    for (let i = 0; i < startIndex; i++) {
      curProcessed += chunksToRun[i]?.length ?? 0;
    }
    setProcessedRecords(curProcessed);

    for (let b = startIndex; b < chunksToRun.length; b++) {
      setCurrentBatchIndex(b);
      try {
        const res = await commitProjectRecordsBatch({
          records: chunksToRun[b],
          batchIndex: b,
          totalBatches: chunksToRun.length,
          importId: idOfImport,
          data_source: dataSource,
        });
        curImported += res.importedCount;
        curUpdated += res.updatedCount;
        curProcessed += res.processedCount;
        setImportedCount(curImported);
        setUpdatedCount(curUpdated);
        setProcessedRecords(curProcessed);
      } catch (err: any) {
        setFailedBatchIndex(b);
        setErrorMessage(err.message || `Batch ${b + 1} failed`);
        setJobState('ERROR');
        return;
      }
    }

    setJobState('COMPLETED');
    setFailedBatchIndex(null);
    setErrorMessage(null);
  };

  const handleConfirmImport = async () => {
    try {
      const validRowsToCommit = validationResult?.validRows;

      if (validRowsToCommit && validRowsToCommit.length > 0) {
        const BATCH_SIZE = 100;
        const totalRows = validRowsToCommit.length;
        const recordChunks: any[][] = [];
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          recordChunks.push(validRowsToCommit.slice(i, i + BATCH_SIZE));
        }

        const newImportId = `imp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        setImportId(newImportId);
        setBatches(recordChunks);
        setTotalRecords(totalRows);
        setTotalBatches(recordChunks.length);
        setProcessedRecords(0);
        setImportedCount(0);
        setUpdatedCount(0);
        setCurrentBatchIndex(0);
        setFailedBatchIndex(null);
        setErrorMessage(null);

        setJobState('QUEUED');

        setTimeout(() => {
          runBatchQueue(0, recordChunks, totalRows, newImportId, 0, 0);
        }, 150);
      } else {
        setJobState('PROCESSING');
        const res = await uploadProjectData(
          file ? { file } : { csv_text: sampleCSVTemplate },
          true,
          dataSource
        );
        setTotalRecords(res.totalRows || 0);
        setProcessedRecords(res.totalRows || 0);
        setImportedCount(res.import_stats?.imported_count || 0);
        setUpdatedCount(res.import_stats?.updated_count || 0);
        setJobState('COMPLETED');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import projects to database');
      setJobState('ERROR');
    }
  };

  return (
    <div id="data-upload-page" className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1E8] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#003B6F] border border-blue-200 mb-1">
            <Database className="h-4 w-4" />
            <span>Data Ingestion & Quality Control Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B6F] font-serif">
            Data Ingestion & Quality
          </h1>
          <p className="text-xs text-[#667085]">
            Upload, validate, preview, quality-check, process, and publish official project telemetry.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-1.5 rounded bg-white text-[#003B6F] border border-[#D9E1E8] hover:bg-[#F5F7FA] px-3.5 py-2 text-xs font-bold shadow-xs transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download CSV Template</span>
        </button>
      </div>

      {/* 6-Step Ingestion Workflow Indicators */}
      <div className="bg-white p-4 rounded-lg border border-[#D9E1E8] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-bold">
          <div className="p-2 rounded bg-[#003B6F] text-white">1. Upload</div>
          <div className={`p-2 rounded ${validating ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
            2. Validate
          </div>
          <div className={`p-2 rounded ${validationResult ? 'bg-blue-50 text-[#005A9C] border border-blue-200' : 'bg-slate-100 text-slate-400'}`}>
            3. Preview
          </div>
          <div className={`p-2 rounded ${validationResult?.valid ? 'bg-emerald-50 text-[#138808] border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
            4. Quality Check
          </div>
          <div className={`p-2 rounded ${jobState === 'PROCESSING' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            5. Process
          </div>
          <div className={`p-2 rounded ${jobState === 'COMPLETED' ? 'bg-[#138808] text-white' : 'bg-slate-100 text-slate-400'}`}>
            6. Publish
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {jobState === 'COMPLETED' && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-[#138808]" />
            <span>Data Ingestion & Publishing Complete — {processedRecords} Records Processed</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/projects')}
              className="rounded bg-[#138808] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              View Updated Projects Directory
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded bg-white border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-800"
            >
              View Monitoring Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">Data Source Provenance</h2>
            <p className="text-xs text-slate-500">Tag data provenance prior to database processing</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {['Official Data', 'PAIMANA Public Dashboard', 'Imported Data', 'Demo Data'].map((src) => (
              <button
                key={src}
                onClick={() => setDataSource(src)}
                className={`px-3 py-1 rounded font-bold border ${
                  dataSource === src
                    ? 'bg-[#003B6F] text-white border-[#003B6F]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-[#D9E1E8] bg-[#F5F7FA] p-8 rounded-lg text-center space-y-3"
        >
          <UploadCloud className="h-10 w-10 text-[#005A9C] mx-auto" />
          <h3 className="text-sm font-bold text-[#172033]">
            Select or Drop Infrastructure Telemetry Spreadsheet (CSV/XLSX)
          </h3>

          <div className="flex justify-center gap-3">
            <label className="cursor-pointer rounded bg-[#003B6F] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#005A9C]">
              <span>Browse File</span>
              <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="hidden" />
            </label>
            <button
              onClick={handleLoadSampleQuick}
              className="rounded bg-white border border-[#D9E1E8] px-4 py-2 text-xs font-bold text-[#172033] hover:bg-slate-50"
            >
              Load Benchmark Dataset (5 Projects)
            </button>
          </div>
        </div>
      </div>

      {/* Validation & Preview Output */}
      {validationResult && (
        <div className="bg-white p-6 rounded-lg border border-[#D9E1E8] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#003B6F]">Data Quality & Validation Summary</h2>
              <p className="text-xs text-[#667085]">
                {validationResult.valid_rows} valid rows out of {validationResult.total_rows} processed
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={jobState === 'PROCESSING'}
              className="rounded bg-[#003B6F] hover:bg-[#005A9C] text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              {jobState === 'PROCESSING' ? 'Processing Records...' : 'Confirm & Publish Dataset'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#F5F7FA] rounded border border-slate-200">
              <span className="text-slate-500 font-bold">Rows Processed</span>
              <div className="text-lg font-black text-[#172033]">{validationResult.total_rows}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-[#138808] font-bold">Valid Rows</span>
              <div className="text-lg font-black text-[#138808]">{validationResult.valid_rows}</div>
            </div>
            <div className="p-3 bg-rose-50 rounded border border-rose-200">
              <span className="text-[#C62828] font-bold">Errors / Warnings</span>
              <div className="text-lg font-black text-[#C62828]">{validationResult.errors.length}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <span className="text-[#005A9C] font-bold">Quality Status</span>
              <div className="text-lg font-black text-[#005A9C]">
                {validationResult.valid ? 'PASSED' : 'CHECK'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
