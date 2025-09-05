'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { addCSRFHeader } from '@/lib/http';

export default function ExitPage() {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [formData, setFormData] = useState({
    type: 'exit',
    note: ''
  });
  const router = useRouter();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(`/api/gate-logs?query=${encodeURIComponent(searchQuery)}&type=entry`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.logs || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching visitors:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedVisitor) {
      newErrors.visitor = 'Please select a visitor to record exit';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        type: 'exit',
        visitorName: selectedVisitor.visitorName,
        visitorPhone: selectedVisitor.visitorPhone,
        visitorAddress: selectedVisitor.visitorAddress,
        plate: selectedVisitor.plate,
        groupSize: selectedVisitor.groupSize,
        note: formData.note.trim() || undefined
      };

      const csrfToken = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1] || '';
      const response = await fetch('/api/gate-logs', {
        method: 'POST',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'POST'
        }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit exit');
      }
      
      // Reset form on success
      setFormData({
        type: 'exit',
        note: ''
      });
      setSelectedVisitor(null);
      
      // Show success message
      // Success - redirect to dashboard
      
      // Redirect back to dashboard
      router.push('/dashboard/watchman');
      
    } catch (error) {
      console.error('Error submitting exit:', error);
      // Error will be handled by toast system
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/watchman">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Record Exit</h1>
            <p className="text-muted-foreground">Record a visitor exit</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Visitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, or vehicle number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching || !searchQuery.trim()}
                size="sm"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Search Results:</p>
                {searchResults.map((visitor) => (
                  <div 
                    key={visitor.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectVisitor(visitor)}
                  >
                    <div className="font-medium">{visitor.visitorName}</div>
                    <div className="text-sm text-muted-foreground">
                      {visitor.visitorPhone && `Phone: ${visitor.visitorPhone}`}
                      {visitor.plate && ` • Vehicle: ${visitor.plate}`}
                      {visitor.at && ` • Entry: ${new Date(visitor.at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-sm text-muted-foreground">No visitors found matching your search.</p>
            )}
          </CardContent>
        </Card>

        {selectedVisitor && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Visitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="font-medium">{selectedVisitor.visitorName}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedVisitor.visitorPhone && `Phone: ${selectedVisitor.visitorPhone}`}
                  {selectedVisitor.visitorAddress && ` • Address: ${selectedVisitor.visitorAddress}`}
                  {selectedVisitor.plate && ` • Vehicle: ${selectedVisitor.plate}`}
                  {selectedVisitor.groupSize && ` • Group: ${selectedVisitor.groupSize} people`}
                  {selectedVisitor.at && ` • Entry: ${new Date(selectedVisitor.at).toLocaleString()}`}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="note" className="block text-sm font-medium">
                    Exit Notes
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Any additional notes about the exit"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows="3"
                  />
                </div>

                {errors.visitor && (
                  <p className="text-sm text-destructive">{errors.visitor}</p>
                )}

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setSelectedVisitor(null);
                      setFormData({ type: 'exit', note: '' });
                    }}
                    disabled={loading}
                  >
                    Change Visitor
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording Exit...
                      </>
                    ) : (
                      'Record Exit'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
