import { useState } from "react";

interface BlockProps {
    totalM2: number;
}
interface CellProps {
    width: number;
    height: number;
}

function Cell({ width, height }: CellProps) {
    return (
        <div style={{ width: `${width}m`, height: `${height}m`, border: '2px solid red' }}>Cell</div>
    );
}

function Block({ totalM2 }: BlockProps) {
    const dimension = Math.sqrt(totalM2); // Calculate the square root to get one side of the grid
    const cells = Array.from({ length: dimension }, () => Array.from({ length: dimension }));

    return (
        <div style={{ display: 'grid', gridTemplateRows: `repeat(${dimension}, 1fr)`, gridTemplateColumns: `repeat(${dimension}, 1fr)` }}>
            {cells.map((row, rowIndex) => (
                row.map((_, colIndex) => <Cell key={`${rowIndex}-${colIndex}`} width={dimension} height={dimension} />)
            ))}
        </div>
    );
}

function Sandbox() {
    const [totalM2, setTotalM2] = useState(16);

    const handleM2Switch = (event: React.ChangeEvent<HTMLInputElement>) => {
        return setTotalM2(Number(event.target.value));
    }

    return (
        <div>
            <div>Sandbox</div>
            <Block totalM2={totalM2} />
            <input type="range" value={totalM2} onChange={handleM2Switch} /> 
        </div>
    );
}

export { Block, Cell, Sandbox };
