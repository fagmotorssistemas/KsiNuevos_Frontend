import React, { createContext, useContext } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

// Contexto simple para manejar el ordenamiento visual
const TableContext = createContext<{
    sortDescriptor?: { column: string; direction: string };
    onSortChange?: (desc: { column: string; direction: string }) => void;
} | null>(null);

export const TableCard = {
    Root: ({ children }: { children: React.ReactNode }) => (
        <div className="overflow-hidden rounded-xl  bg-white shadow-sm">
            {children}
        </div>
    )
};

export const Table = ({
    children,
    sortDescriptor,
    onSortChange,
    ...props
}: any) => {
    return (
        <TableContext.Provider value={{ sortDescriptor, onSortChange }}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" {...props}>
                    {children}
                </table>
            </div>
        </TableContext.Provider>
    );
};

// Header Components
Table.Header = ({ children }: any) => (
    <thead className="bg-black">
        <tr>
            {children}
        </tr>
    </thead>
);

Table.Head = ({ id, label, allowsSorting, className = "" }: any) => {
    const context = useContext(TableContext);
    const isSorted = context?.sortDescriptor?.column === id;
    const direction = isSorted ? context?.sortDescriptor?.direction : null;

    const handleClick = () => {
        if (allowsSorting && context?.onSortChange) {
            context.onSortChange({
                column: id,
                direction: direction === "ascending" ? "descending" : "ascending"
            });
        }
    };

    return (
        <th
            scope="col"
            onClick={handleClick}
            className={`px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider
                ${allowsSorting ? 'cursor-pointer hover:bg-gray-900 select-none' : ''}
                ${className}`}
        >
            <div className="flex items-center gap-1">
                {label}
                {direction === "ascending" && <ArrowUp className="h-3 w-3 text-red-600" />}
                {direction === "descending" && <ArrowDown className="h-3 w-3 text-red-600" />}
            </div>
        </th>
    );
};

// Body Components
Table.Body = ({ items, children }: any) => (
    <tbody className="divide-y divide-gray-200 bg-white">
        {items && items.length > 0 ? (
            items.map((item: any) => (
                <React.Fragment key={item.id || Math.random()}>
                    {children(item)}
                </React.Fragment>
            ))
        ) : (
            <tr>
                <td colSpan={100} className="px-6 py-10 text-center text-neutral-700 text-sm">
                    No se encontraron datos.
                </td>
            </tr>
        )}
    </tbody>
);

Table.Row = ({ children }: any) => (
    <tr className="hover:bg-neutral-100 transition-colors">
        {children}
    </tr>
);

Table.Cell = ({ children, className = "" }: any) => (
    <td className={`px-6 py-4 text-sm text-black ${className}`}>
        {children}
    </td>
);
