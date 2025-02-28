"use client"
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaCode, FaSpinner, FaMoon, FaSun, FaLock } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';

interface FormData {
  repoUrl: string;
  prNumber: string;
  githubToken: string;
}

interface ApiResponse {
  message: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://16.16.65.132:5001/start_task/', {
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

      const data: ApiResponse = await response.json();
      console.log(data)
      setIsSuccess(true);
      setMessage(data.message);
    } catch (error) {
      setIsSuccess(false);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
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
          className="max-w-lg mx-auto"
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
                <p>{message}</p>
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
