import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Printer, 
  Play, 
  Eye, 
  RefreshCw,
  Sparkles,
  Lock,
  Calendar,
  Download
} from 'lucide-react';
import { formatINR, formatBL, formatLPL } from '../../utils/exciseCalc';

export const ComplianceDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [portalInfo, setPortalInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [botLogs, setBotLogs] = useState<Array<{ step: string; message: string; percent: number; time?: string }>>([]);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    ackNo: string;
    screenshotPath?: string;
    message: string;
  } | null>(null);
  const [headlessMode, setHeadlessMode] = useState<boolean>(false); // default to visible so manager can watch browser bot!

  const fetchPortalInfo = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/portal-info?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setPortalInfo(json.data);
      }
    } catch (err) {
      console.error('Error fetching portal info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalInfo(selectedDate);
  }, [selectedDate]);

  const handleOpenBotModal = async () => {
    setIsBotModalOpen(true);
    setSubmissionResult(null);
    setBotLogs([]);
    try {
      const res = await fetch('/api/compliance/fetch-captcha');
      const json = await res.json();
      if (json.success && json.data.captcha) {
        setCaptchaCode(json.data.captcha);
      }
    } catch (err) {
      console.warn('Could not auto-fetch captcha:', err);
    }
  };

  const handleRunBot = async () => {
    setIsBotRunning(true);
    setBotLogs([
      { step: 'INIT', message: 'Starting West Bengal Excise automated submission worker...', percent: 10 }
    ]);

    try {
      const res = await fetch('/api/compliance/trigger-portal-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          captchaSolution: captchaCode,
          headless: headlessMode
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Portal worker submission failed');
      }

      setSubmissionResult(json.data);
      if (json.data.logs) {
        setBotLogs(json.data.logs);
      }
      fetchPortalInfo(selectedDate);
    } catch (err: any) {
      alert(`Worker error: ${err.message}`);
      setBotLogs(prev => [
        ...prev,
        { step: 'ERROR', message: `Execution failed: ${err.message}`, percent: 100 }
      ]);
    } finally {
      setIsBotRunning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto select-none">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              West Bengal e-Abgari / WBSBCL Compliance Hub
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
              DIRECTORATE OF EXCISE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated statutory daily return filing, Excel generation, and receipt extraction for Retail FL Off-Shop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <a
            href={`/api/compliance/export-excel?date=${selectedDate}`}
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download e-Abgari Excel</span>
          </a>

          <button
            onClick={handleOpenBotModal}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-950 active:scale-95"
          >
            <Bot className="w-4 h-4" />
            <span>Review & Trigger Portal Bot [F10]</span>
          </button>
        </div>
      </div>

      {/* Statutory Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Return Filing Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-mono mb-1">E-ABGARI FILING STATUS</div>
          <div className="flex items-center gap-2 mt-2">
            {portalInfo?.isSubmitted ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-base font-bold text-white">SUBMITTED & VERIFIED</div>
                  <div className="text-xs font-mono text-emerald-400 mt-0.5">
                    Ack No: {portalInfo.ackNo}
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-base font-bold text-white">PENDING SUBMISSION</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Due by 23:59 IST today
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Stock Discrepancy Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-mono mb-1">AUDIT INTEGRITY CHECK</div>
          <div className="flex items-center gap-2 mt-2">
            {portalInfo?.discrepancyCount === 0 ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-base font-bold text-white">ZERO DISCREPANCIES</div>
                  <div className="text-xs text-slate-400 mt-0.5">Physical matches theoretical ledger</div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-rose-400" />
                <div>
                  <div className="text-base font-bold text-rose-300">
                    {portalInfo?.discrepancyCount} VARIANCES DETECTED
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Requires manager sign-off</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: License & Portal Gateway */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-mono mb-1">PORTAL ENDPOINT GATEWAY</div>
          <div className="mt-2 text-xs font-mono">
            <div className="text-white font-bold truncate">
              {portalInfo?.shop?.portal_url || 'http://localhost:5001/portal-simulator'}
            </div>
            <div className="text-slate-400 mt-1 flex items-center gap-2">
              <span>Retailer: {portalInfo?.shop?.portal_username || 'RET_KOL_8912'}</span>
              <span>•</span>
              <a 
                href={portalInfo?.shop?.portal_url || '/portal-simulator'} 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Official WBSBCL Form DSR-3 Statement Preview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Statutory Form DSR-3 (Retail Sales & Stock Statement)
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Automated calculation via Bengal Excise Act (LPL = BL * Str% / 57.12)
          </div>
        </div>

        {portalInfo?.totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 font-mono text-xs">
            <div>
              <span className="text-slate-400">Total Bottles Sold: </span>
              <strong className="text-emerald-400">{portalInfo.totals.totalSalesBottles}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Bulk Litres (BL): </span>
              <strong className="text-cyan-400">{formatBL(portalInfo.totals.totalSalesBL)}</strong>
            </div>
            <div>
              <span className="text-slate-400">London Proof Litres (LPL): </span>
              <strong className="text-amber-400">{formatLPL(portalInfo.totals.totalSalesLPL)}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Sales Turnover: </span>
              <strong className="text-emerald-400">{formatINR(portalInfo.totals.totalSalesValue)}</strong>
            </div>
          </div>
        )}

        <div className="bg-slate-950/60 p-4 rounded-xl border border-dashed border-slate-800 text-center flex-1 flex flex-col items-center justify-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-2" />
          <h4 className="text-sm font-bold text-slate-300">
            WBSBCL Daily Return Ready for Portal Attachment
          </h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            The certified Excel statement has been compiled using ExcelJS with official Government of West Bengal Excise Directorate header, license metadata, formula-driven bulk liters and LPL duty totals.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={`/api/compliance/export-excel?date=${selectedDate}`}
              download
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Inspect Generated .xlsx Statement</span>
            </a>
            <button
              onClick={handleOpenBotModal}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950"
            >
              <Bot className="w-4 h-4" />
              <span>Launch Automated Portal Filing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review & Trigger Automation Modal */}
      {isBotModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
          onClick={() => !isBotRunning && setIsBotModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  e-Abgari Automated Submission Worker
                </h3>
              </div>
              {!isBotRunning && (
                <button onClick={() => setIsBotModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Submission Result Success Screen */}
              {submissionResult && submissionResult.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500 rounded-xl text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <h4 className="text-base font-black text-white uppercase tracking-wide">
                      e-Abgari Daily Return Successfully Accepted!
                    </h4>
                    <div className="text-lg font-mono font-bold text-emerald-300 mt-2 bg-black/40 py-1.5 px-3 rounded inline-block border border-emerald-700">
                      {submissionResult.ackNo}
                    </div>
                    <p className="text-xs text-slate-300 mt-2">
                      Digital receipt recorded under Bengal Excise Act, 1909. Acknowledgement token archived in SQLite.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsBotModalOpen(false)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pre-flight Data Review */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-slate-300 uppercase tracking-wider mb-1">
                      1. Pre-Flight Return Verification
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-slate-400">
                      <div>Date: <strong className="text-white">{selectedDate}</strong></div>
                      <div>License: <strong className="text-white">{portalInfo?.shop?.license_no}</strong></div>
                      <div>Retailer ID: <strong className="text-white">{portalInfo?.shop?.portal_username}</strong></div>
                      <div>Total Sales Value: <strong className="text-emerald-400">{formatINR(portalInfo?.totals?.totalSalesValue)}</strong></div>
                    </div>
                  </div>

                  {/* Captcha & Bot Controls */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="font-bold text-slate-300 uppercase tracking-wider text-xs">
                      2. Security Captcha & Execution Mode
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Security Captcha Code:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={captchaCode}
                            onChange={e => setCaptchaCode(e.target.value.toUpperCase())}
                            placeholder="Enter 5 chars"
                            className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 font-mono font-bold text-cyan-400 text-sm tracking-widest uppercase focus:outline-none focus:border-cyan-400"
                          />
                          <span className="text-xs text-slate-500 font-mono">
                            (Auto-read from portal DOM)
                          </span>
                        </div>
                      </div>

                      <div className="ml-auto flex items-center gap-2 pt-4">
                        <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!headlessMode}
                            onChange={e => setHeadlessMode(!e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700"
                          />
                          <span>Watch Bot Live in Browser</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Progress Log */}
                  {isBotRunning && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          <span>Automation Bot in Progress...</span>
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-36 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
                        {botLogs.map((log, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-purple-400">[{log.step}]</span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trigger Button */}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setIsBotModalOpen(false)}
                      disabled={isBotRunning}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleRunBot}
                      disabled={isBotRunning}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isBotRunning ? 'Executing...' : 'Trigger Automated Filing'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
