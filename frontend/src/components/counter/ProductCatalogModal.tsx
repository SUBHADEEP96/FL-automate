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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header & Search Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Excise Brand Catalog Search
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                [F1] Hotkey
              </span>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
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
              placeholder="Type brand name (e.g. Royal Challenge), pack size, or EAN barcode..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
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
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'All Brands' : cat}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-500 font-mono">
              Use ↑ ↓ and Enter
            </span>
          </div>
        </div>

        {/* Product List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 p-2">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching brands found for "{searchTerm}"
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
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-800/90 ring-1 ring-cyan-500/50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.category === 'IMFL' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
                      p.category === 'Beer' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800/60' :
                      p.category === 'Wine' ? 'bg-rose-950 text-rose-300 border border-rose-800/60' :
                      'bg-purple-950 text-purple-300 border border-purple-800/60'
                    }`}>
                      {p.category.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                          {p.pack_size_ml}ml
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{p.code}</span>
                        <span>•</span>
                        <span>EAN: {p.ean}</span>
                        <span>•</span>
                        <span>Str: {p.strength_pct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {formatINR(p.mrp)}
                    </div>
                    <div className={`text-[11px] font-mono ${p.current_stock < (p.min_stock_alert || 12) ? 'text-rose-400' : 'text-slate-400'}`}>
                      Stock: <span className="font-bold">{p.current_stock}</span> btls
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredProducts.length}</strong> items
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-mono text-xs"
          >
            [Esc] Close
          </button>
        </div>
      </div>
    </div>
  );
};
