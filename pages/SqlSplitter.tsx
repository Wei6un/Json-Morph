import React, { useState } from 'react';
import { format, SqlLanguage } from 'sql-formatter';

interface SqlSplitterProps {
    theme: 'dark' | 'light';
}

const SqlSplitter: React.FC<SqlSplitterProps> = ({ theme }) => {
    const isDark = theme === 'dark';
    const [inputSql, setInputSql] = useState('');
    const [outputSql, setOutputSql] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [formatMode, setFormatMode] = useState<'split' | 'format'>('format');
    const [sqlDialect, setSqlDialect] = useState<SqlLanguage>('postgresql');

    const handleFormat = () => {
        try {
            setError(null);
            if (!inputSql.trim()) {
                setOutputSql('');
                return;
            }

            if (formatMode === 'format') {
                const formatted = format(inputSql, {
                    language: sqlDialect,
                    tabWidth: 4,
                    keywordCase: 'upper',
                    linesBetweenQueries: 2,
                });
                setOutputSql(formatted);
                return;
            }

            // Simple RegExp to parse SELECT ... FROM ...
            // This is basic and might struggle with nested queries, but handles the specified use case.
            const selectRegex = /SELECT\s+([\s\S]+?)\s+FROM\s+([^\s;]+)/i;
            const match = inputSql.match(selectRegex);

            if (!match) {
                setError('無法解析 SQL 語法，請確保包含 SELECT 和 FROM 關鍵字。');
                return;
            }

            const selectClause = match[1];
            let fromTable = match[2];

            // Check if fromTable already has with (nolock)
            const afterFromIdx = inputSql.toLowerCase().indexOf('from') + 4;
            const restOfSql = inputSql.substring(afterFromIdx).trim();
            // Try to extract exact table string from the original
            const tableMatch = restOfSql.match(/^([^\s;]+)/);
            if (tableMatch) {
                fromTable = tableMatch[1];
            }

            // Split columns
            const columns = selectClause.split(',').map(col => col.trim()).filter(col => col !== '');

            // Group every 2 columns and join with comma
            const formattedLines: string[] = [];
            for (let i = 0; i < columns.length; i += 2) {
                const chunk = columns.slice(i, i + 2);
                formattedLines.push(chunk.join(', '));
            }

            const formattedSelect = formattedLines.join(',\n');
            const newSql = `SELECT\n${formattedSelect}\n\nFROM ${fromTable} with (nolock)`;

            setOutputSql(newSql);

        } catch (err) {
            setError('發生錯誤：' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleCopy = () => {
        if (outputSql) {
            navigator.clipboard.writeText(outputSql);
        }
    };

    return (
        <div className={`flex flex-col h-full gap-4 max-w-7xl mx-auto w-full animate-fade-in`}>
            {/* Header */}
            <div className={`p-4 rounded-xl backdrop-blur-sm ${isDark ? 'bg-slate-800/50 border border-slate-700/50 text-white' : 'bg-white shadow-sm border border-gray-200 text-gray-900'}`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        SQL 字串格式化與分割
                    </h2>
                    <div className="flex items-center gap-3">
                        <select
                            value={formatMode}
                            onChange={(e) => setFormatMode(e.target.value as 'split' | 'format')}
                            className={`px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDark
                                    ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-400'
                                }`}
                        >
                            <option value="format">標準格式化</option>
                            <option value="split">自訂分割 (含 nolock)</option>
                        </select>

                        {formatMode === 'format' && (
                            <select
                                value={sqlDialect}
                                onChange={(e) => setSqlDialect(e.target.value as SqlLanguage)}
                                className={`px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-400'
                                    }`}
                            >
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                                <option value="sqlite">SQLite</option>
                                <option value="tsql">SQL Server (T-SQL)</option>
                                <option value="mariadb">MariaDB</option>
                            </select>
                        )}

                        <button
                            onClick={handleFormat}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm whitespace-nowrap"
                        >
                            執行
                        </button>
                    </div>
                </div>
                <p className={`text-xs mt-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {formatMode === 'split'
                        ? '自訂分割：貼上包含 SELECT 與 FROM 的 SQL 語法，工具會將 SELECT 欄位每 2 個換一次行，並自動在 FROM 的資料表名稱後加 with (nolock)。'
                        : '標準格式化：使用 sql-formatter 來重新排版 SQL 語句，支援多種資料庫方言。'
                    }
                </p>
                {error && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs">
                        {error}
                    </div>
                )}
            </div>

            {/* Editor Area */}
            <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[500px]`}>
                {/* Input */}
                <div className={`flex flex-col p-4 rounded-xl ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
                    <label className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>輸入 SQL</label>
                    <textarea
                        value={inputSql}
                        onChange={(e) => setInputSql(e.target.value)}
                        className={`flex-1 w-full p-3 font-mono text-sm resize-none focus:outline-none rounded-lg custom-scrollbar transition-colors ${isDark
                            ? 'bg-slate-800 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 selection:bg-blue-500/30'
                            : 'bg-white text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-blue-400 selection:bg-blue-100'
                            }`}
                        placeholder="在此貼上您的 SQL 查詢..."
                        spellCheck="false"
                    />
                </div>

                {/* Output */}
                <div className={`flex flex-col p-4 rounded-xl ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>輸出結果</label>
                        <button
                            onClick={handleCopy}
                            disabled={!outputSql}
                            className={`p-1.5 rounded transition-colors ${outputSql
                                ? (isDark ? 'hover:bg-slate-800 text-blue-400 hover:text-blue-300' : 'hover:bg-gray-200 text-blue-600 hover:text-blue-700')
                                : (isDark ? 'text-slate-600' : 'text-gray-400')
                                }`}
                            title="複製"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                    <textarea
                        value={outputSql}
                        readOnly
                        className={`flex-1 w-full p-3 font-mono text-sm resize-none focus:outline-none rounded-lg custom-scrollbar transition-colors ${isDark
                            ? 'bg-slate-800/80 text-green-400 selection:bg-green-500/30'
                            : 'bg-white text-green-700 selection:bg-green-100'
                            }`}
                        placeholder="結果將顯示於此..."
                        spellCheck="false"
                    />
                </div>
            </div>
        </div>
    );
};

export default SqlSplitter;
