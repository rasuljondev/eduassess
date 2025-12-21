import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useAlert } from '../../shared/ui/AlertProvider';
import { Button } from '../../shared/ui/Button';
import { submissionService, testService, scoreService } from '../../services';
import type { SubmissionWithDetails, Test, Score } from '../../types';
import { FileText, CheckCircle, Clock, X, Eye, Phone, User, Calendar, Star, Save } from 'lucide-react';

export const SubmissionsManagement: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionWithDetails | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoringSubmission, setScoringSubmission] = useState<SubmissionWithDetails | null>(null);
  const [scoreData, setScoreData] = useState<{ score: string; isPublished: boolean }>({
    score: '',
    isPublished: true, // Default checked
  });
  const [existingScore, setExistingScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  useEffect(() => {
    if (user?.centerSlug) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.centerSlug) return;
    
    setLoading(true);
    try {
      const [fetchedSubmissions, fetchedTests] = await Promise.all([
        submissionService.getSubmissions(user.centerSlug),
        testService.getTests(user.centerSlug),
      ]);
      
      // Map submissions with test names
      const submissionsWithDetails: SubmissionWithDetails[] = fetchedSubmissions.map(sub => ({
        ...sub,
        testName: fetchedTests.find(t => t.id === (sub as any).testId)?.name || 'Unknown Test',
        isGraded: (sub as any).isGraded || false,
        phoneNumber: (sub as any).phoneNumber,
      }));
      
      setSubmissions(submissionsWithDetails);
      setTests(fetchedTests);
    } catch (err: any) {
      showError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScoreModal = async (submission: SubmissionWithDetails) => {
    setScoringSubmission(submission);
    setShowScoreModal(true);
    
    // Load existing score if any
    try {
      const score = await scoreService.getScore(submission.id);
      if (score) {
        setExistingScore(score);
        // Extract numeric score from JSON (try to get "overall" or first numeric value)
        const finalScore = score.finalScore;
        const scoreValue = finalScore?.overall || finalScore?.score || Object.values(finalScore)[0] || '';
        setScoreData({
          score: String(scoreValue),
          isPublished: score.isPublished,
        });
      } else {
        setExistingScore(null);
        setScoreData({
          score: '',
          isPublished: true, // Default checked
        });
      }
    } catch (err: any) {
      console.error('Failed to load score:', err);
      setExistingScore(null);
      setScoreData({
        score: '',
        isPublished: true, // Default checked
      });
    }
  };

  const handleSaveScore = async () => {
    if (!scoringSubmission) return;

    try {
      // Validate score is a number
      const scoreValue = parseFloat(scoreData.score);
      if (isNaN(scoreValue) || scoreValue < 0) {
        showError('Please enter a valid numeric score (e.g., 5, 6, 7.5)');
        return;
      }

      // Convert to JSON format for database
      const finalScoreObj: Record<string, any> = {
        overall: scoreValue,
        score: scoreValue, // Also store as "score" for compatibility
      };

      setSavingScore(true);
      await scoreService.saveScore(scoringSubmission.id, {
        finalScore: finalScoreObj,
        isPublished: scoreData.isPublished,
      });

      showSuccess('Score saved successfully!');
      setShowScoreModal(false);
      setScoringSubmission(null);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save score');
    } finally {
      setSavingScore(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (selectedTest !== 'all' && sub.testId !== selectedTest) return false;
    if (statusFilter === 'pending' && sub.isGraded) return false;
    if (statusFilter === 'graded' && !sub.isGraded) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Submissions</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and grade student submissions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filter by Test
            </label>
            <select
              value={selectedTest}
              onChange={e => setSelectedTest(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Tests</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 p-3 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Submissions</option>
              <option value="pending">Pending Grading</option>
              <option value="graded">Graded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center">
          <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No submissions found</h4>
          <p className="text-gray-600 dark:text-gray-400">
            {statusFilter !== 'all' || selectedTest !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Submissions will appear here once students complete tests'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Test</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Submitted</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => (
                  <tr key={submission.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{submission.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        {submission.phoneNumber ? (
                          <>
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{submission.phoneNumber}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Not provided</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{submission.testName}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      {submission.isGraded ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Graded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingSubmission(submission)}
                          leftIcon={<Eye className="w-4 h-4" />}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          color="indigo"
                          onClick={() => handleOpenScoreModal(submission)}
                          leftIcon={<Star className="w-4 h-4" />}
                        >
                          {submission.isGraded ? 'Edit Score' : 'Score'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Submission Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Submission Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {viewingSubmission.fullName} - {viewingSubmission.testName}
                </p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Student Name</p>
                      <p className="text-gray-900 dark:text-white">{viewingSubmission.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Phone Number</p>
                      <p className="text-gray-900 dark:text-white">{viewingSubmission.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Submitted At</p>
                      <p className="text-gray-900 dark:text-white">{new Date(viewingSubmission.submittedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-gray-900 dark:text-white">{viewingSubmission.isGraded ? 'Graded' : 'Pending'}</p>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Student Answers</h4>
                  <div className="space-y-4">
                    {Object.entries(viewingSubmission.answers).map(([questionId, answer], index) => (
                      <div key={questionId} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            {index + 1}
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">Question {index + 1}</p>
                        </div>
                        <div className="ml-9">
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{answer as string}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setViewingSubmission(null)}
              >
                Close
              </Button>
              <Button
                color="indigo"
                onClick={() => {
                  setViewingSubmission(null);
                  handleOpenScoreModal(viewingSubmission);
                }}
                leftIcon={<Star className="w-5 h-5" />}
              >
                {viewingSubmission.isGraded ? 'Edit Score' : 'Add Score'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && scoringSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Score Submission</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {scoringSubmission.fullName} - {scoringSubmission.testName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowScoreModal(false);
                  setScoringSubmission(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Score Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Score <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={scoreData.score}
                    onChange={e => setScoreData({ ...scoreData, score: e.target.value })}
                    placeholder="Enter score (e.g., 5, 6, 7.5)"
                    className="w-full border-2 border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-semibold"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter a numeric score (e.g., 5, 6, 7.5). This will be saved as the overall score.
                  </p>
                </div>

                {/* Publish Toggle */}
                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <input
                    type="checkbox"
                    id="publishScore"
                    checked={scoreData.isPublished}
                    onChange={e => setScoreData({ ...scoreData, isPublished: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="publishScore" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Send score through Telegram bot (default checked)
                  </label>
                </div>

                {/* Existing Score Display */}
                {existingScore && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Current Score:</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {existingScore.finalScore?.overall || existingScore.finalScore?.score || Object.values(existingScore.finalScore)[0] || 'N/A'}
                    </p>
                    {existingScore.isPublished && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ✓ Published - Students can view this score via Telegram bot
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScoreModal(false);
                  setScoringSubmission(null);
                }}
                disabled={savingScore}
              >
                Cancel
              </Button>
              <Button
                color="green"
                onClick={handleSaveScore}
                isLoading={savingScore}
                leftIcon={<Save className="w-5 h-5" />}
              >
                Save Score
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

