import { Calculator, Truck, AlertTriangle, CheckCircle, Info, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useState } from 'react';
import { PostTruckDialog, type PostTruckInitialValues } from './PostTruckDialog';

interface LoadPlan {
  frontSection: number;
  middleSection: number;
  rearSection: number;
  totalWeight: number;
  isBalanced: boolean;
  warnings: string[];
  hasExtraSpace: boolean;
  extraSpacePercentage: number;
  extraHeadcount: number;
  extraWeightKg: number;
}

const livestockWeights: Record<string, number> = {
  cattle: 500,
  horses: 450,
  sheep: 70,
  goats: 55,
  pigs: 110,
};

const requiredSpace: Record<string, number> = {
  cattle: 1.5,
  horses: 2.0,
  sheep: 0.5,
  goats: 0.5,
  pigs: 0.8,
};

export function WeightCalculator() {
  const [livestockCount, setLivestockCount] = useState('');
  const [livestockType, setLivestockType] = useState('cattle');
  const [truckLength, setTruckLength] = useState('');
  const [truckWidth, setTruckWidth] = useState('');
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null);
  const [postTruckOpen, setPostTruckOpen] = useState(false);
  const [postTruckInitial, setPostTruckInitial] = useState<PostTruckInitialValues | undefined>();

  const calculateLoadPlan = () => {
    const count = parseInt(livestockCount);
    const length = parseFloat(truckLength);
    const width = parseFloat(truckWidth);

    if (!count || !length || !width) return;

    const avgWeight = livestockWeights[livestockType];
    const totalWeight = count * avgWeight;
    const truckArea = length * width;

    const frontSection = Math.round(count * 0.3);
    const middleSection = Math.round(count * 0.4);
    const rearSection = count - frontSection - middleSection;

    const warnings: string[] = [];

    const spacePerAnimal = truckArea / count;

    if (spacePerAnimal < requiredSpace[livestockType]) {
      warnings.push(`Insufficient space: ${spacePerAnimal.toFixed(2)} m² per animal (minimum: ${requiredSpace[livestockType]} m²)`);
    }

    const maxTruckWeight = 20000;
    if (totalWeight > maxTruckWeight) {
      warnings.push(`Total weight ${totalWeight} kg exceeds truck capacity of ${maxTruckWeight} kg`);
    }

    const isBalanced = warnings.length === 0;

    const extraSpacePercentage = (spacePerAnimal - requiredSpace[livestockType]) / requiredSpace[livestockType] * 100;
    const hasExtraSpace = extraSpacePercentage > 0;

    const extraArea = truckArea - count * requiredSpace[livestockType];
    const extraHeadcount = hasExtraSpace ? Math.floor(extraArea / requiredSpace[livestockType]) : 0;
    const extraWeightKg = extraHeadcount * avgWeight;

    setLoadPlan({
      frontSection,
      middleSection,
      rearSection,
      totalWeight,
      isBalanced,
      warnings,
      hasExtraSpace,
      extraSpacePercentage,
      extraHeadcount,
      extraWeightKg,
    });
  };

  const resetCalculator = () => {
    setLivestockCount('');
    setLivestockType('cattle');
    setTruckLength('');
    setTruckWidth('');
    setLoadPlan(null);
  };

  const handlePostAvailableSpace = () => {
    if (!loadPlan) return;

    const typeName = livestockType.charAt(0).toUpperCase() + livestockType.slice(1);

    setPostTruckInitial({
      capacity_headcount: String(loadPlan.extraHeadcount),
      capacity_weight_kg: String(loadPlan.extraWeightKg),
      allow_shared: true,
      notes: `Extra space from weight calculator: ${loadPlan.extraSpacePercentage.toFixed(0)}% surplus capacity. Can carry ~${loadPlan.extraHeadcount} more ${typeName.toLowerCase()} (${loadPlan.extraWeightKg} kg). Truck dimensions: ${truckLength}m × ${truckWidth}m.`,
    });
    setPostTruckOpen(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Weight Distribution Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculate optimal livestock placement for safe and balanced transport
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-6">Load Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Livestock Type *</label>
              <select
                value={livestockType}
                onChange={(e) => setLivestockType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900"
              >
                <option value="cattle">Cattle (avg 500 kg)</option>
                <option value="horses">Horses (avg 450 kg)</option>
                <option value="sheep">Sheep (avg 70 kg)</option>
                <option value="goats">Goats (avg 55 kg)</option>
                <option value="pigs">Pigs (avg 110 kg)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Number of Animals *</label>
              <input
                type="number"
                value={livestockCount}
                onChange={(e) => setLivestockCount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900"
                placeholder="e.g., 75"
                min="1"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-4">Truck Dimensions</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Length (meters) *</label>
                  <input
                    type="number"
                    value={truckLength}
                    onChange={(e) => setTruckLength(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900"
                    placeholder="e.g., 12"
                    step="0.1"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Width (meters) *</label>
                  <input
                    type="number"
                    value={truckWidth}
                    onChange={(e) => setTruckWidth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900"
                    placeholder="e.g., 2.5"
                    step="0.1"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={calculateLoadPlan}
                className="flex-1 px-6 py-2 text-sm bg-primary hover:bg-primary/90 text-white"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </Button>
              <Button
                onClick={resetCalculator}
                variant="outline"
                className="px-6 py-2 text-sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Load Plan Visualization */}
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-6">Load Plan</h2>

          {!loadPlan ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Truck className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm">Enter load details to see distribution plan</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-lg border-l-4 flex items-start gap-3 ${
                  loadPlan.isBalanced
                    ? 'bg-green-50 border-green-500'
                    : 'bg-orange-50 border-orange-500'
                }`}
              >
                {loadPlan.isBalanced ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${loadPlan.isBalanced ? 'text-green-700' : 'text-orange-700'}`}>
                    {loadPlan.isBalanced ? 'Load Plan Optimized' : 'Warnings Detected'}
                  </p>
                  {!loadPlan.isBalanced && (
                    <ul className="mt-2 space-y-1">
                      {loadPlan.warnings.map((warning, idx) => (
                        <li key={idx} className="text-xs text-orange-700">&bull; {warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Weight Distribution Visual */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Total Weight:</span>
                  <span className="font-medium">{loadPlan.totalWeight.toLocaleString()} kg</span>
                </div>

                {/* Truck Visualization */}
                <div className="border-2 rounded-lg p-4 border-primary/40">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Distribution Plan</span>
                  </div>

                  {/* Front Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Front Section (30%)</span>
                      <span>{loadPlan.frontSection} animals</span>
                    </div>
                    <div className="w-full h-12 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary/30 transition-all"
                        style={{ width: '30%' }}
                      />
                      <span className="text-xs text-gray-600 relative z-10">
                        {((loadPlan.frontSection / parseInt(livestockCount)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Middle Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Middle Section (40%)</span>
                      <span>{loadPlan.middleSection} animals</span>
                    </div>
                    <div className="w-full h-12 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary/50 transition-all"
                        style={{ width: '40%' }}
                      />
                      <span className="text-xs text-gray-600 relative z-10">
                        {((loadPlan.middleSection / parseInt(livestockCount)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Rear Section */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Rear Section (30%)</span>
                      <span>{loadPlan.rearSection} animals</span>
                    </div>
                    <div className="w-full h-12 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary/30 transition-all"
                        style={{ width: '30%' }}
                      />
                      <span className="text-xs text-gray-600 relative z-10">
                        {((loadPlan.rearSection / parseInt(livestockCount)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-900">
                      <strong>Distribution Logic:</strong> Optimal weight distribution follows a 30-40-30 pattern
                      (front-middle-rear) to ensure vehicle stability and animal comfort during transport.
                    </p>
                  </div>
                </div>

                {/* Extra Space Available - Post on Truckboard */}
                {loadPlan.hasExtraSpace && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-green-900 font-medium mb-1">
                          Extra Space Available!
                        </p>
                        <p className="text-xs text-green-700">
                          Your truck has {loadPlan.extraSpacePercentage.toFixed(0)}% extra space
                          (~{loadPlan.extraHeadcount} more animals, {loadPlan.extraWeightKg.toLocaleString()} kg).
                          Post this on the Truckboard to maximize your trip revenue.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handlePostAvailableSpace}
                      className="w-full px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Post Available Space on Truckboard
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Guidelines Section */}
      <Card className="mt-6 p-6">
        <h2 className="text-lg font-medium mb-4">Loading Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Space Requirements</h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>&bull; Cattle: 1.5 m&sup2; per animal</li>
              <li>&bull; Horses: 2.0 m&sup2; per animal</li>
              <li>&bull; Sheep/Goats: 0.5 m&sup2; per animal</li>
              <li>&bull; Pigs: 0.8 m&sup2; per animal</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Safety Tips</h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>&bull; Never exceed maximum capacity</li>
              <li>&bull; Ensure proper ventilation</li>
              <li>&bull; Separate incompatible species</li>
              <li>&bull; Secure all partitions</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Best Practices</h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>&bull; Load heavier animals first</li>
              <li>&bull; Balance weight distribution</li>
              <li>&bull; Check animals before departure</li>
              <li>&bull; Plan regular rest stops</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Post Truck Dialog - pre-filled with calculator values */}
      <PostTruckDialog
        open={postTruckOpen}
        onOpenChange={setPostTruckOpen}
        initialValues={postTruckInitial}
        onPosted={() => setPostTruckOpen(false)}
      />
    </div>
  );
}

export default WeightCalculator;
