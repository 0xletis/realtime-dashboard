import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ControlsProps {
  connectionStatus: string;
  onTimeframeChange: (value: string) => void;
  onPairChange: (value: string) => void;
}

const Controls = ({ connectionStatus, onTimeframeChange, onPairChange }: ControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between mb-2 bg-[#002713]/50 p-2 rounded-lg border border-[#003920]">
      <div className="flex items-center gap-3 w-full sm:w-auto mb-2 sm:mb-0">
        <div className="flex items-center gap-2 bg-[#001a0f] px-3 py-1 rounded-md border border-[#003920] w-full sm:w-auto">
          <span className="font-medium tracking-tight text-gray-400">STATUS</span>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className={`font-medium tracking-wide ${connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <Select onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-full sm:w-[180px] font-mono bg-[#001a0f] border-[#003920] text-gray-100">
            <SelectValue placeholder="1m" />
          </SelectTrigger>
          <SelectContent className="bg-[#001a0f] border-[#003920]">
            <SelectGroup className="font-mono text-gray-100">
              <SelectLabel className="text-white">Timeframe</SelectLabel>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1D</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select onValueChange={onPairChange}>
          <SelectTrigger className="w-full sm:w-[180px] font-mono bg-[#001a0f] border-[#003920] text-gray-100">
            <SelectValue placeholder="BTCUSDT" />
          </SelectTrigger>
          <SelectContent className="bg-[#001a0f] border-[#003920]">
            <SelectGroup className="font-mono text-gray-100">
              <SelectLabel className="text-white">Pair</SelectLabel>
              <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
              <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
              <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
              <SelectItem value="PEPEUSDT">PEPEUSDT</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default Controls; 