import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const PhoneInput = ({ value, onChange, label = "Mobile Number" }: PhoneInputProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const numericValue = e.target.value.replace(/\D/g, "");
    // Limit to 10 digits (Philippine mobile numbers without country code)
    onChange(numericValue.slice(0, 10));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">{label}</Label>
      <div className="flex">
        <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm font-medium">
          +63
        </div>
        <Input
          id="phone"
          type="tel"
          placeholder="9XX XXX XXXX"
          value={value}
          onChange={handleChange}
          className="rounded-l-none"
          maxLength={10}
        />
      </div>
      <p className="text-xs text-muted-foreground">Enter your 10-digit mobile number</p>
    </div>
  );
};

export default PhoneInput;
