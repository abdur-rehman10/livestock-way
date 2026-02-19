import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Search, 
  Briefcase, 
  Wrench, 
  ShoppingCart,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { toast, swalConfirm } from '../lib/swal';

interface MarketplaceItem {
  id: string;
  type: 'job' | 'service' | 'equipment';
  title: string;
  description: string;
  price?: string;
  salary?: string;
  location: string;
  postedBy: string;
  postedDate: string;
  category?: string;
  status: 'active' | 'closed';
  views?: number;
  applications?: number;
}

const mockItems: MarketplaceItem[] = [
  {
    id: 'J001',
    type: 'job',
    title: 'CDL Class A Driver - Livestock Transport',
    description: 'Seeking experienced livestock hauler. Must have clean driving record and animal handling experience.',
    salary: '$65,000 - $75,000/year',
    location: 'Austin, TX',
    postedBy: 'Texas Livestock Transport',
    postedDate: '2 days ago',
    category: 'Driver Position',
    status: 'active',
    views: 145,
    applications: 12,
  },
  {
    id: 'E001',
    type: 'equipment',
    title: 'Livestock Trailer - 2020 Model',
    description: 'Well-maintained 53ft livestock trailer with climate control. Recent inspection.',
    price: '$45,000',
    location: 'Dallas, TX',
    postedBy: 'Hill Country Hauling',
    postedDate: '5 days ago',
    category: 'Trailers',
    status: 'active',
    views: 89,
  },
  {
    id: 'S001',
    type: 'service',
    title: 'Mobile Veterinary Services',
    description: 'Pre-transport health checks, vaccinations, and wellness exams. Available 24/7.',
    price: '$150/visit',
    location: 'San Antonio, TX',
    postedBy: 'Dr. Sarah Mitchell DVM',
    postedDate: '1 week ago',
    category: 'Veterinary',
    status: 'active',
    views: 234,
  },
  {
    id: 'J002',
    type: 'job',
    title: 'Farm Manager - Cattle Ranch',
    description: 'Oversee daily operations of 500-head cattle ranch. Experience with livestock management required.',
    salary: '$55,000/year',
    location: 'Waco, TX',
    postedBy: 'Green Acres Ranch',
    postedDate: '3 days ago',
    category: 'Management',
    status: 'active',
    views: 78,
    applications: 8,
  },
];

interface MarketplaceTabProps {
  userRole?: 'hauler' | 'shipper' | 'stakeholder' | 'driver' | 'super-admin';
}

export function MarketplaceTab({ userRole = 'hauler' }: MarketplaceTabProps) {
  const [items, setItems] = useState<MarketplaceItem[]>(mockItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'job' | 'service' | 'equipment'>('job');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');

  const handlePost = () => {
    const newItem: MarketplaceItem = {
      id: `${selectedType[0].toUpperCase()}${Date.now()}`,
      type: selectedType,
      title,
      description,
      price: selectedType === 'job' ? undefined : price,
      salary: selectedType === 'job' ? price : undefined,
      location,
      category,
      postedBy: 'You',
      postedDate: 'Just now',
      status: 'active',
      views: 0,
      applications: selectedType === 'job' ? 0 : undefined,
    };

    setItems([newItem, ...items]);
    setIsPostDialogOpen(false);
    
    // Reset form
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setCategory('');
    
    toast.success(`${selectedType === 'job' ? 'Job' : selectedType === 'service' ? 'Service' : 'Equipment'} posted successfully!`);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await swalConfirm({
      title: 'Remove Item',
      text: 'Remove this item from the marketplace?',
      confirmText: 'Yes, remove',
    });
    if (!confirmed) return;
    setItems(items.filter(item => item.id !== id));
    toast.success('Item removed from marketplace');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'job': return <Briefcase className="w-5 h-5" />;
      case 'service': return <Wrench className="w-5 h-5" />;
      case 'equipment': return <ShoppingCart className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'job': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'service': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'equipment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl text-gray-900 dark:text-gray-100">Marketplace</h2>
          <p className="text-gray-600 dark:text-gray-400">Find jobs, equipment, and services</p>
        </div>
        
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#29CA8D] hover:bg-[#24b67d]">
              <Plus className="w-4 h-4 mr-2" />
              Post to Marketplace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post to Marketplace</DialogTitle>
              <DialogDescription>
                Share job openings, equipment for sale, or services you offer
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Listing Type</Label>
                <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="job">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Job
                    </TabsTrigger>
                    <TabsTrigger value="service">
                      <Wrench className="w-4 h-4 mr-2" />
                      Service
                    </TabsTrigger>
                    <TabsTrigger value="equipment">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Equipment
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input 
                  placeholder={
                    selectedType === 'job' ? 'e.g., CDL Class A Driver' :
                    selectedType === 'service' ? 'e.g., Mobile Vet Services' :
                    'e.g., Livestock Trailer 2020'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea 
                  placeholder="Provide detailed information about the listing..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Price/Salary */}
              <div className="space-y-2">
                <Label>{selectedType === 'job' ? 'Salary Range' : 'Price'} *</Label>
                <Input 
                  placeholder={
                    selectedType === 'job' ? '$50,000 - $60,000/year' : '$500'
                  }
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input 
                  placeholder="e.g., Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedType === 'job' && (
                      <>
                        <SelectItem value="Driver Position">Driver Position</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Farm Help">Farm Help</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                    {selectedType === 'service' && (
                      <>
                        <SelectItem value="Veterinary">Veterinary</SelectItem>
                        <SelectItem value="Washout">Washout</SelectItem>
                        <SelectItem value="Feed Supply">Feed Supply</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </>
                    )}
                    {selectedType === 'equipment' && (
                      <>
                        <SelectItem value="Trailers">Trailers</SelectItem>
                        <SelectItem value="Trucks">Trucks</SelectItem>
                        <SelectItem value="Tools">Tools & Equipment</SelectItem>
                        <SelectItem value="Parts">Parts</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handlePost}
                  className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                  disabled={!title || !description || !price || !location}
                >
                  Post Listing
                </Button>
                <Button 
                  onClick={() => setIsPostDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search marketplace..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="job">Jobs</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Jobs</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {items.filter(i => i.type === 'job' && i.status === 'active').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Services</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {items.filter(i => i.type === 'service' && i.status === 'active').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Equipment</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {items.filter(i => i.type === 'equipment' && i.status === 'active').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-start gap-2 justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg text-gray-900 dark:text-gray-100">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{item.type}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {item.price || item.salary}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {item.postedDate}
                    </div>
                    {item.views !== undefined && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {item.views} views
                      </div>
                    )}
                    {item.applications !== undefined && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {item.applications} applications
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {item.postedBy === 'You' ? (
                      <>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="bg-[#29CA8D] hover:bg-[#24b67d]">
                          {item.type === 'job' ? 'Apply Now' : 'Contact Seller'}
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg text-gray-900 dark:text-gray-100 mb-2">No listings found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your search or filters
              </p>
              <Button 
                onClick={() => setIsPostDialogOpen(true)}
                className="bg-[#29CA8D] hover:bg-[#24b67d]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post First Listing
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
