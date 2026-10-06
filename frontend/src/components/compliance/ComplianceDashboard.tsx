import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Calendar,
  Download,
  Sparkles,
  ArrowRight,
  Play
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
  const [headlessMode, setHeadlessMode] = useState<boolean>(false);

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
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto select-none bg-slate-100">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm">
              WB
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                West Bengal e-Abgari Compliance Portal
              </h2>
              <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                <span>Krishnanagar Range, Nadia District Excise Office</span>
                <span>•</span>
                <span className="text-indigo-800 font-mono font-bold">Retailer Code: {portalInfo?.shop?.retailer_code || 'WBSBCL-NAD-4102'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 font-black focus:outline-none cursor-pointer"
            />
          </div>

          <a
            href={`/api/compliance/export-excel?date=${selectedDate}`}
            download
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download e-Abgari Excel</span>
          </a>

          <button
            onClick={handleOpenBotModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Automate Portal Filing [F10]</span>
          </button>
        </div>
      </div>

      {/* Structured 3-Step Guide for Shop Manager */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-indigo-700 font-black uppercase mb-1">
              Step 1: Daily Stock Audit
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5">
              Verify Sales & Volume Count
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Inspect all counter bottles sold and depot consignments received today to ensure zero stock discrepancies.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Stock Status:</span>
            {portalInfo?.discrepancyCount === 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1 font-black">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified (Zero Diff)</span>
              </span>
            ) : (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 font-black">
                {portalInfo?.discrepancyCount} items mismatched
              </span>
            )}
          </div>
        </div>

        {/* Step 2 Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-emerald-700 font-black uppercase mb-1">
              Step 2: Statutory FORM DSR-3
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5">
              WBSBCL Prescribed Return Format
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Pre-calculated spreadsheet applying West Bengal Excise BL and LPL formulas across all pack sizes.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200">
            <a
              href={`/api/compliance/export-excel?date=${selectedDate}`}
              download
              className="text-xs text-emerald-700 font-black hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Download .xlsx Statement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Step 3 Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-mono text-blue-700 font-black uppercase mb-1">
              Step 3: Portal Submission & Ack
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5">
              File Return to e-Abgari
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Automated worker logs in, solves Captcha, uploads DSR-3 return file, and retrieves official acknowledgment token.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Portal Status:</span>
            {portalInfo?.isSubmitted ? (
              <span className="text-emerald-700 font-black font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                ✓ Token: {portalInfo.ackNo}
              </span>
            ) : (
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-black">
                Pending Filing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Action Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 mb-3 shadow-xs">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
          One-Click e-Abgari Return Automation
        </h3>
        <p className="text-sm text-slate-600 max-w-lg mt-2 mb-6 font-sans leading-relaxed font-medium">
          Automated worker for <strong>Krishnanagar FL Off-Shop ({portalInfo?.shop?.license_no})</strong> logs into the official portal, submits certified daily sales & stock returns, and archives the digital acknowledgment.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenBotModal}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black flex items-center gap-2.5 shadow-lg shadow-indigo-600/30 pos-btn-press cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Review & Trigger Portal Filing</span>
          </button>

          <a
            href={portalInfo?.shop?.portal_url || '/portal-simulator'}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Official Portal Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
          </a>
        </div>
      </div>

      {/* Review & Trigger Modal */}
      {isBotModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none overflow-y-auto"
          onClick={() => !isBotRunning && setIsBotModalOpen(false)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  e-Abgari Return Filing Wizard
                </h3>
              </div>
              {!isBotRunning && (
                <button onClick={() => setIsBotModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer">
                  ✕
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {submissionResult && submissionResult.success ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-lg font-black text-slate-900 uppercase">
                    Return Successfully Submitted & Acknowledged!
                  </h4>
                  <div className="text-xl font-mono font-black text-emerald-800 bg-emerald-100/70 py-2 px-4 rounded-xl border border-emerald-300 inline-block">
                    {submissionResult.ackNo}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Statutory acknowledgment receipt recorded under Bengal Excise Act 1909 for Krishnanagar FL Off-Shop, Nadia.
                  </p>
                  <button
                    onClick={() => setIsBotModalOpen(false)}
                    className="mt-3 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs font-sans">
                    <div className="font-black text-slate-800 uppercase tracking-wider mb-1">
                      Store & Return Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono font-medium">
                      <div>Shop: <strong className="text-slate-900">Krishnanagar FL Off-Shop</strong></div>
                      <div>Date: <strong className="text-slate-900">{selectedDate}</strong></div>
                      <div>License: <strong className="text-slate-900">{portalInfo?.shop?.license_no}</strong></div>
                      <div>Total Sales: <strong className="text-emerald-700 font-bold">{formatINR(portalInfo?.totals?.totalSalesValue)}</strong></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Security Captcha Code:
                      </label>
                      <label className="text-xs text-slate-600 font-semibold flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!headlessMode}
                          onChange={e => setHeadlessMode(!e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                        />
                        <span>Run in visible browser window</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={captchaCode}
                        onChange={e => setCaptchaCode(e.target.value.toUpperCase())}
                        placeholder="CAPTCHA"
                        className="w-36 bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 font-mono font-black text-indigo-700 text-base tracking-widest uppercase focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-500 font-medium font-sans">
                        (Auto-fetched from portal)
                      </span>
                    </div>
                  </div>

                  {isBotRunning && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto font-mono text-xs text-slate-700 space-y-1">
                      {botLogs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-indigo-600 font-bold">[{log.step}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setIsBotModalOpen(false)}
                      disabled={isBotRunning}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleRunBot}
                      disabled={isBotRunning}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md pos-btn-press cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isBotRunning ? 'Submitting Return...' : 'Start Automated Submission'}</span>
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
