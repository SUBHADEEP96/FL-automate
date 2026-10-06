import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Package, Sparkles } from 'lucide-react';
import { Product, LiquorCategory } from '../../types';
import { formatINR } from '../../utils/exciseCalc';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.ean.includes(term);
    return matchesCategory && matchesSearch;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        onSelectProduct(filteredProducts[highlightedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Brand Catalog Search
              </h3>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                [F1] Hotkey
              </span>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="🔍 Search brand name (e.g. Royal Challenge), pack size, or barcode..."
              className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans font-medium"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3">
            {['ALL', 'IMFL', 'Beer', 'Wine', 'CS'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setHighlightedIndex(0);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm font-black'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Brands' : cat}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-500 font-mono font-medium">
              Use ↑ ↓ to navigate and Enter to select
            </span>
          </div>
        </div>

        {/* Product List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium">
              No brands found matching "{searchTerm}"
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const isSelected = highlightedIndex === idx;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-500/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${
                      p.category === 'IMFL' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      p.category === 'Beer' ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' :
                      p.category === 'Wine' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}>
                      {p.category.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          {p.pack_size_ml}ml
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="font-semibold">{p.code}</span>
                        <span>•</span>
                        <span>EAN: {p.ean}</span>
                        <span>•</span>
                        <span>Str: {p.strength_pct}% v/v</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black font-mono text-emerald-700">
                      {formatINR(p.mrp)}
                    </div>
                    <div className={`text-[11px] font-mono font-bold ${p.current_stock < (p.min_stock_alert || 12) ? 'text-rose-600' : 'text-slate-600'}`}>
                      Stock: <span>{p.current_stock}</span> btls
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            Total <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> brands listed
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};
