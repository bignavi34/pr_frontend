"use client"
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaCode, FaSpinner, FaMoon, FaSun, FaLock, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';

interface FormData {
  repoUrl: string;
  prNumber: string;
  githubToken: string;
}

interface Issue {
  type: string;
  description: string;
  location: string;
  line: number;
  suggestion: string;
}

interface Result {
  results: string | null | any[];
  file_name: string | null;
  error: string | null;
}

interface ApiResponse {
  message: string;
}

interface NextApiResponse {
  task_id: string;
  result: Result;
  status: string;
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    repoUrl: '',
    prNumber: '',
    githubToken: '',
  });
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [taskData, setTaskData] = useState<NextApiResponse | null>(null);
  const [fetchingStatus, setFetchingStatus] = useState<boolean>(false);
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Helper function to parse and extract JSON from string if present
  const extractJsonFromString = (text: string): any => {
    try {
      // Look for JSON pattern in the string
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // If no JSON in code blocks, try to parse the whole string
      return JSON.parse(text);
    } catch (e) {
      console.log("Not valid JSON or no JSON found in string");
      return null;
    }
  };

  const toggleIssueExpansion = (issueId: string) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  const fetchTaskStatus = async () => {
    try {
      setFetchingStatus(true);
      const response = await fetch("https://dibyatc.me/task_status/", {
        method: 'GET',
      });

      const data = await response.json();
      console.log('Task status data:', data);

      // Create a properly structured result object
      let resultObj: Result = {
        results: null,
        file_name: null,
        error: null
      };

      // Handle nested result structures
      if (data && typeof data === 'object') {
        if (data.result) {
          if (typeof data.result === 'string') {
            resultObj.results = data.result;
          } else if (typeof data.result === 'object') {
            // Handle direct result properties
            if (data.result.error !== undefined) {
              resultObj.error = data.result.error;
            }
            if (data.result.file_name !== undefined) {
              resultObj.file_name = data.result.file_name;
            }

            // Handle the case where results is an array or a string
            if (Array.isArray(data.result.results)) {
              resultObj.results = data.result.results;
            } else if (typeof data.result.results === 'string') {
              // Try to parse JSON from the string if present
              const extractedJson = extractJsonFromString(data.result.results);
              resultObj.results = extractedJson || data.result.results;
            } else {
              resultObj.results = data.result.results;
            }
          }
        } else if (Array.isArray(data.results)) {
          // Handle the case where results is directly at the top level
          resultObj.results = data.results;
        }

        setTaskData({
          task_id: String(data.task_id || ''),
          status: String(data.status || ''),
          result: resultObj
        });
      }
    } catch (error) {
      console.error("Task status error:", error);
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTaskData(null);
    setExpandedIssues({});

    try {
      // First API call to start the task
      const response = await fetch('https://dibyatc.me/start_task/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: formData.repoUrl,
          pr_number: parseInt(formData.prNumber),
          github_token: formData.githubToken || undefined,
        }),
      });

      const data = await response.json();
      setIsSuccess(true);

      // Handle the response correctly - convert to string if it's an object
      if (typeof data === 'object') {
        setMessage(data.message || JSON.stringify(data));
      } else {
        setMessage(String(data));
      }

      // Set a 10-second delay before fetching task status
      setMessage(prev => prev + "\nFetching results after 10 seconds...");

      setTimeout(() => {
        fetchTaskStatus();
      }, 10000);

    } catch (error) {
      setIsSuccess(false);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  // Process results to extract issues if they exist
  const processResults = (results: any): { issues: Issue[] | null, otherData: any } => {
    if (!results) return { issues: null, otherData: null };

    // Check if results is a string that contains JSON
    if (typeof results === 'string') {
      const extractedJson = extractJsonFromString(results);
      if (extractedJson && extractedJson.issues && Array.isArray(extractedJson.issues)) {
        return {
          issues: extractedJson.issues,
          otherData: { ...extractedJson, issues: undefined }
        };
      }
      return { issues: null, otherData: results };
    }

    // Check if results is an array with objects that might contain issues
    if (Array.isArray(results) && results.length > 0) {
      for (const item of results) {
        if (typeof item === 'object' && item !== null) {
          // Check if the item itself has an issues array
          if (item.issues && Array.isArray(item.issues)) {
            return {
              issues: item.issues,
              otherData: { ...item, issues: undefined }
            };
          }

          // Check if the item has a results property that might contain issues
          if (item.results) {
            const extractedJson = typeof item.results === 'string'
              ? extractJsonFromString(item.results)
              : item.results;

            if (extractedJson && extractedJson.issues && Array.isArray(extractedJson.issues)) {
              return {
                issues: extractedJson.issues,
                otherData: { ...extractedJson, issues: undefined }
              };
            }
          }
        }
      }
    }

    // Check if results is an object with an issues array
    if (typeof results === 'object' && results !== null) {
      if (results.issues && Array.isArray(results.issues)) {
        return {
          issues: results.issues,
          otherData: { ...results, issues: undefined }
        };
      }
    }

    return { issues: null, otherData: results };
  };

  // Render issue cards with collapsible details
  const renderIssueCards = (issues: Issue[]) => {
    if (!issues || issues.length === 0) return null;

    // Group issues by type
    const issuesByType: Record<string, Issue[]> = {};
    issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    return (
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Issues Found ({issues.length})
        </h3>

        {Object.entries(issuesByType).map(([type, typeIssues]) => (
          <div key={type} className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className={`px-4 py-3 ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {type} ({typeIssues.length})
              </h4>
            </div>
            <div className="p-2">
              {typeIssues.map((issue, index) => {
                const issueId = `${type}-${index}`;
                const isExpanded = expandedIssues[issueId] || false;

                return (
                  <div
                    key={issueId}
                    className={`mb-2 p-3 rounded ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                  >
                    <div
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleIssueExpansion(issueId)}
                    >
                      <div className="flex-1">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {issue.description}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Location: {issue.location} (Line {issue.line})
                        </p>
                      </div>
                      <div className={`p-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={`mt-3 p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <p className={`mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Suggestion:
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {issue.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Format the results for display
  const formatResults = (results: any): React.ReactNode => {
    if (!results) return null;

    // Process results to extract issues if they exist
    const { issues, otherData } = processResults(results);

    return (
      <div className="space-y-6">
        {issues && issues.length > 0 && renderIssueCards(issues)}

        {otherData && (
          <div className="space-y-2">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Additional Information
            </h3>
            {typeof otherData === 'object' ? (
              <pre className="whitespace-pre-wrap bg-black/10 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(otherData, null, 2)}
              </pre>
            ) : (
              <p className="whitespace-pre-wrap">{String(otherData)}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
      <Head>
        <title>GitHub PR Analyzer</title>
        <meta name="description" content="Analyze GitHub pull requests with ease" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.7 }}
              >
                <FaGithub className={`text-5xl ${darkMode ? 'text-purple-400' : 'text-indigo-600'} mr-4`} />
              </motion.div>
              <h1 className={`text-4xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                PR <span className={darkMode ? 'text-purple-400' : 'text-indigo-600'}>Analyzer</span>
              </h1>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-indigo-100 text-indigo-600'}`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}
          >
            <div className={`${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} py-6 px-8`}>
              <h2 className="text-white text-xl font-semibold flex items-center">
                <FaCode className="mr-2" />
                Analyze GitHub Pull Request
              </h2>
              <p className={`${darkMode ? 'text-purple-200' : 'text-indigo-100'} text-sm mt-1`}>
                Submit the details below to start analyzing
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="repoUrl">
                  Repository URL
                </label>
                <div className="relative">
                  <input
                    className={`appearance-none border rounded-lg w-full py-3 px-4 pl-10 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-transparent'
                      : 'border-gray-300 text-gray-700 focus:ring-indigo-500 focus:border-transparent'
                      }`}
                    id="repoUrl"
                    type="text"
                    placeholder="https://github.com/username/repo"
                    value={formData.repoUrl}
                    onChange={handleChange}
                    required
                  />
                  <FaGithub className={`absolute left-3 top-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="prNumber">
                  PR Number
                </label>
                <div className="relative">
                  <input
                    className={`appearance-none border rounded-lg w-full py-3 px-4 pl-10 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-transparent'
                      : 'border-gray-300 text-gray-700 focus:ring-indigo-500 focus:border-transparent'
                      }`}
                    id="prNumber"
                    type="number"
                    placeholder="123"
                    value={formData.prNumber}
                    onChange={handleChange}
                    required
                  />
                  <span className={`absolute left-3 top-3.5 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>#</span>
                </div>
              </div>

              <div className="mb-8">
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="githubToken">
                  GitHub Token (Optional)
                </label>
                <div className="relative">
                  <input
                    className={`appearance-none border rounded-lg w-full py-3 px-4 pl-10 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500 focus:border-transparent'
                      : 'border-gray-300 text-gray-700 focus:ring-indigo-500 focus:border-transparent'
                      }`}
                    id="githubToken"
                    type="password"
                    placeholder="Your GitHub token"
                    value={formData.githubToken}
                    onChange={handleChange}
                  />
                  <FaLock className={`absolute left-3 top-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <div className={`flex items-center mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Required for private repositories
                  <a
                    href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ml-2 inline-flex items-center ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-800'}`}
                  >
                    Learn more <HiOutlineExternalLink className="ml-1" />
                  </a>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full font-medium py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-300 ${darkMode
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white focus:ring-purple-500 hover:from-purple-700 hover:to-indigo-700'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white focus:ring-indigo-500 hover:from-indigo-700 hover:to-purple-700'
                  } ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </span>
                ) : 'Analyze Pull Request'}
              </motion.button>
            </form>
          </motion.div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className={`mt-6 p-4 rounded-lg shadow-md ${darkMode
                  ? (isSuccess
                    ? 'bg-green-900/30 border-l-4 border-green-500 text-green-300'
                    : 'bg-red-900/30 border-l-4 border-red-500 text-red-300')
                  : (isSuccess
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 text-emerald-700'
                    : 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 text-red-700')
                  }`}
                role="alert"
              >
                <p className="font-medium">{isSuccess ? 'Success!' : 'Error'}</p>
                <p className="whitespace-pre-line">{message}</p>
                {fetchingStatus && (
                  <div className="mt-2 flex items-center">
                    <FaSpinner className="animate-spin mr-2" />
                    <span>Fetching task status...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {taskData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className={`mt-6 p-6 rounded-lg shadow-md ${darkMode
                  ? 'bg-indigo-900/30 border border-indigo-700 text-indigo-100'
                  : 'bg-white border border-indigo-100 text-indigo-900'
                  }`}
                role="alert"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Analysis Results
                  </h3>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${taskData.status === 'SUCCESS'
                        ? (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800')
                        : taskData.status === 'PENDING'
                          ? (darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                          : (darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800')
                      }`}>
                      {taskData.status}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Task: {taskData.task_id}
                    </span>
                  </div>
                </div>

                {taskData.result && (
                  <div className="mt-2">
                    {taskData.result.error ? (
                      <div className={`p-4 rounded ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                        <p className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Error:</p>
                        <p className="mt-1 whitespace-pre-wrap">{taskData.result.error}</p>
                      </div>
                    ) : (
                      <div>
                        {taskData.result.results && (
                          <div className="space-y-4">
                            <div className="mt-1 overflow-y-auto max-h-screen">
                              {formatResults(taskData.result.results)}
                            </div>
                          </div>
                        )}
                        {taskData.result.file_name && (
                          <div className={`mt-4 p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <p className="flex items-center">
                              <span className={`font-medium mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Analysis File:</span>
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{taskData.result.file_name}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              © {new Date().getFullYear()} PR Analyzer • Built with Next.js & FastAPI
            </p>

            <div className="flex justify-center mt-3 space-x-4">
              <motion.a
                whileHover={{ y: -2 }}
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-lg ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-indigo-600'}`}
              >
                <FaGithub />
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
