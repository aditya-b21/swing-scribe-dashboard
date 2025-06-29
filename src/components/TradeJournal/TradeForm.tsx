
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { TradeFormData, SetupType } from '@/types/trade';

interface TradeFormProps {
  onTradeAdded: () => void;
}

const setupOptions: SetupType[] = ['VCP Setup A1', 'Rocket Base A2', 'IPO Base A3', 'Extra Setup'];

export function TradeForm({ onTradeAdded }: TradeFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TradeFormData>({
    stock_name: '',
    buy_price: 0,
    sell_price: undefined,
    quantity: 1,
    setup_name: 'VCP Setup A1',
  });
  const [chartImage, setChartImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      setChartImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setChartImage(null);
    setPreviewUrl('');
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trade-charts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('trade-charts')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to add trades');
      return;
    }

    if (!formData.stock_name.trim()) {
      toast.error('Please enter a stock name');
      return;
    }

    if (formData.buy_price <= 0) {
      toast.error('Please enter a valid buy price');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setIsLoading(true);

    try {
      let chartImageUrl = null;
      if (chartImage) {
        chartImageUrl = await uploadImage(chartImage);
        if (!chartImageUrl) {
          toast.error('Failed to upload chart image');
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          stock_name: formData.stock_name.toUpperCase().trim(),
          buy_price: formData.buy_price,
          sell_price: formData.sell_price,
          quantity: formData.quantity,
          setup_name: formData.setup_name,
          chart_image_url: chartImageUrl,
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast.success('Trade added successfully!');
      
      // Reset form
      setFormData({
        stock_name: '',
        buy_price: 0,
        sell_price: undefined,
        quantity: 1,
        setup_name: 'VCP Setup A1',
      });
      removeImage();
      
      onTradeAdded();
    } catch (error: any) {
      console.error('Error adding trade:', error);
      toast.error(error.message || 'Failed to add trade');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-effect border-white/10">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_name">Stock Name *</Label>
              <Input
                id="stock_name"
                placeholder="e.g., RELIANCE, INFY"
                value={formData.stock_name}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_name: e.target.value }))}
                required
                className="bg-white/5 border-white/20 uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup_name">Setup Type *</Label>
              <Select
                value={formData.setup_name}
                onValueChange={(value) => setFormData(prev => ({ ...prev, setup_name: value as SetupType }))}
              >
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {setupOptions.map((setup) => (
                    <SelectItem key={setup} value={setup}>{setup}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buy_price">Buy Price (₹) *</Label>
              <Input
                id="buy_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.buy_price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, buy_price: parseFloat(e.target.value) || 0 }))}
                required
                className="bg-white/5 border-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell_price">Sell Price (₹) - Optional</Label>
              <Input
                id="sell_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.sell_price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sell_price: parseFloat(e.target.value) || undefined }))}
                className="bg-white/5 border-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                required
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          {/* Chart Upload */}
          <div className="space-y-2">
            <Label>Chart Screenshot</Label>
            {!previewUrl ? (
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="chart-upload"
                />
                <label
                  htmlFor="chart-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-accent-gold" />
                  <span className="text-text-secondary">Click to upload chart image</span>
                  <span className="text-xs text-text-secondary">PNG, JPG up to 5MB</span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Chart preview"
                  className="w-full max-h-40 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="gradient-gold text-dark-bg font-semibold flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Adding Trade...' : 'Add Trade'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
