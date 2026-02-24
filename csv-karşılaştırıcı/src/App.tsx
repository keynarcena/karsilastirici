/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { isEqual, differenceWith } from 'lodash';
import { Upload, FileText, ArrowRightLeft, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CSVData {
  data: any[];
  fileName: string;
  headers: string[];
}

export default function App() {
  const [fileA, setFileA] = useState<CSVData | null>(null);
  const [fileB, setFileB] = useState<CSVData | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<{
    onlyInA: any[];
    onlyInB: any[];
    common: any[];
    stockAlerts: any[];
  } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, side: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvData: CSVData = {
          data: results.data,
          fileName: file.name,
          headers: results.meta.fields || [],
        };
        if (side === 'A') setFileA(csvData);
        else setFileB(csvData);
        setResults(null);
      },
    });
  };

  const compareCSVs = () => {
    if (!fileA || !fileB) return;
    setIsComparing(true);

    // Simple comparison: Row by row content
    setTimeout(() => {
      const onlyInA = differenceWith(fileA.data, fileB.data, isEqual);
      const onlyInB = differenceWith(fileB.data, fileA.data, isEqual);
      const common = fileA.data.filter(rowA => 
        fileB.data.some(rowB => isEqual(rowA, rowB))
      );

      // Specific Logic: 
      // Base on A, check B's 2nd column (index 1)
      // If B <= 0 and A > 0
      const stockAlerts: any[] = [];
      const headerA_ID = fileA.headers[0];
      const headerA_Stock = fileA.headers[1];
      const headerB_ID = fileB.headers[0];
      const headerB_Stock = fileB.headers[1];

      if (headerA_ID && headerA_Stock && headerB_ID && headerB_Stock) {
        fileA.data.forEach(rowA => {
          const matchB = fileB.data.find(rowB => rowB[headerB_ID] === rowA[headerA_ID]);
          if (matchB) {
            const valA = parseFloat(rowA[headerA_Stock]);
            const valB = parseFloat(matchB[headerB_Stock]);
            
            if (valA > 0 && valB <= 0) {
              stockAlerts.push({
                ...rowA,
                _stockA: valA,
                _stockB: valB
              });
            }
          }
        });
      }

      setResults({ onlyInA, onlyInB, common, stockAlerts });
      setIsComparing(false);
    }, 500);
  };

  const reset = () => {
    setFileA(null);
    setFileB(null);
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-zinc-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-light tracking-tight mb-2"
          >
            CSV <span className="font-semibold">Karşılaştırıcı</span>
          </motion.h1>
          <p className="text-zinc-500">İki CSV dosyası arasındaki farkları anında görün.</p>
        </header>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <UploadCard 
            side="A" 
            file={fileA} 
            onUpload={(e) => handleFileUpload(e, 'A')} 
            onRemove={() => { setFileA(null); setResults(null); }}
          />
          <UploadCard 
            side="B" 
            file={fileB} 
            onUpload={(e) => handleFileUpload(e, 'B')} 
            onRemove={() => { setFileB(null); setResults(null); }}
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={compareCSVs}
            disabled={!fileA || !fileB || isComparing}
            className={`
              flex items-center gap-2 px-8 py-4 rounded-2xl font-medium transition-all
              ${!fileA || !fileB 
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg hover:shadow-xl active:scale-95'}
            `}
          >
            {isComparing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRightLeft size={20} />
            )}
            {isComparing ? 'Karşılaştırılıyor...' : 'Dosyaları Karşılaştır'}
          </button>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {results && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Stock Alerts - New Primary View */}
              <div className="bg-white rounded-[32px] p-8 shadow-xl border-2 border-red-100 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Stok Kritik Uyarıları</h2>
                    <p className="text-sm text-zinc-500">Aide Stok'ta var olan ( &gt; 0 ) ancak TSoft Stok'ta tükenmiş ( ≤ 0 ) ürünler.</p>
                  </div>
                  <div className="ml-auto bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    {results.stockAlerts.length} Ürün
                  </div>
                </div>

                {results.stockAlerts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ürün / ID</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Aide Stok</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">TSoft Stok</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {results.stockAlerts.map((item, idx) => (
                          <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-zinc-900">{item[fileA?.headers[0] || '']}</td>
                            <td className="px-6 py-4 text-emerald-600 font-bold">{item._stockA}</td>
                            <td className="px-6 py-4 text-red-600 font-bold">{item._stockB}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">
                                <AlertCircle size={12} /> Bitti
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-20" />
                    <p className="text-zinc-500">Kritik stok uyarısı bulunamadı.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                  title="Sadece Aide'de" 
                  count={results.onlyInA.length} 
                  icon={<AlertCircle className="text-amber-500" />} 
                />
                <StatCard 
                  title="Sadece TSoft'ta" 
                  count={results.onlyInB.length} 
                  icon={<AlertCircle className="text-blue-500" />} 
                />
                <StatCard 
                  title="Ortak Satırlar" 
                  count={results.common.length} 
                  icon={<CheckCircle2 className="text-emerald-500" />} 
                />
              </div>

              {/* Detailed Tables */}
              <div className="grid lg:grid-cols-2 gap-8">
                <ResultTable 
                  title="Aide Stok'a Özgü Satırlar" 
                  data={results.onlyInA} 
                  headers={fileA?.headers || []} 
                  color="amber"
                />
                <ResultTable 
                  title="TSoft Stok'a Özgü Satırlar" 
                  data={results.onlyInB} 
                  headers={fileB?.headers || []} 
                  color="blue"
                />
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={reset}
                  className="text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-2 text-sm uppercase tracking-widest font-semibold"
                >
                  <Trash2 size={16} />
                  Tümünü Temizle
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function UploadCard({ side, file, onUpload, onRemove }: { 
  side: string, 
  file: CSVData | null, 
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onRemove: () => void
}) {
  return (
    <div className="bg-white rounded-[24px] p-8 shadow-sm border border-zinc-100 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">{side === 'A' ? 'Aide Stok' : 'TSoft Stok'}</span>
          <h2 className="text-xl font-semibold">CSV Yükle</h2>
        </div>
        {file && (
          <button onClick={onRemove} className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-full transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {!file ? (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-all">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
            <p className="mb-2 text-sm text-zinc-500">
              <span className="font-semibold">Tıkla</span> veya sürükle bırak
            </p>
            <p className="text-xs text-zinc-400">Sadece .csv dosyaları</p>
          </div>
          <input type="file" className="hidden" accept=".csv" onChange={onUpload} />
        </label>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{file.fileName}</p>
            <p className="text-xs text-zinc-500">{file.data.length} satır bulundu</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, count, icon }: { title: string, count: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-zinc-100 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-semibold text-zinc-900">{count}</p>
      </div>
    </div>
  );
}

function ResultTable({ title, data, headers, color }: { 
  title: string, 
  data: any[], 
  headers: string[],
  color: 'amber' | 'blue'
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-8 shadow-sm border border-zinc-100 flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-zinc-900 mb-1">{title}</h3>
        <p className="text-sm text-zinc-400">Farklılık bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-zinc-100 overflow-hidden flex flex-col max-h-[500px]">
      <div className="p-6 border-bottom border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {data.length} Satır
        </span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-50/50 sticky top-0 z-10">
            <tr>
              {headers.slice(0, 4).map((header, i) => (
                <th key={i} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  {header}
                </th>
              ))}
              {headers.length > 4 && <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">...</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                {headers.slice(0, 4).map((header, j) => (
                  <td key={j} className="px-6 py-4 text-sm text-zinc-600 truncate max-w-[150px]">
                    {String(row[header] || '')}
                  </td>
                ))}
                {headers.length > 4 && <td className="px-6 py-4 text-xs text-zinc-400">...</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="p-4 text-center text-xs text-zinc-400 bg-zinc-50/30">
            İlk 50 satır gösteriliyor.
          </div>
        )}
      </div>
    </div>
  );
}
