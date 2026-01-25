import { useState, useCallback } from 'react';
import { SectionTitle, EmptyState, Button, Badge } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useProjectStore, toast } from '@/stores';
import { logger } from '@/utils/logger';

interface TestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  duration?: number;
  error?: string;
}

export function Tests() {
  const { currentProject } = useProjectStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState('');

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const skipCount = results.filter(r => r.status === 'skip').length;

  const parseTestOutput = useCallback((stdout: string): TestResult[] => {
    const tests: TestResult[] = [];

    // Try to parse common test output formats
    // Jest/Vitest format: ✓ test name (XXms)
    const jestPattern = /([✓✗○])\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm;
    let match;

    while ((match = jestPattern.exec(stdout)) !== null) {
      const [, status, name, duration] = match;
      tests.push({
        id: `test-${tests.length}`,
        name: name.trim(),
        status: status === '✓' ? 'pass' : status === '✗' ? 'fail' : 'skip',
        duration: duration ? parseInt(duration) : undefined,
      });
    }

    // If no Jest format found, try simple pass/fail patterns
    if (tests.length === 0) {
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('PASS') || line.includes('passed')) {
          const name = line.replace(/PASS|passed/gi, '').trim();
          if (name) {
            tests.push({ id: `test-${tests.length}`, name, status: 'pass' });
          }
        } else if (line.includes('FAIL') || line.includes('failed')) {
          const name = line.replace(/FAIL|failed/gi, '').trim();
          if (name) {
            tests.push({ id: `test-${tests.length}`, name, status: 'fail' });
          }
        }
      }
    }

    return tests;
  }, []);

  const runTests = useCallback(async () => {
    if (!currentProject?.path) {
      toast.error('No project selected');
      return;
    }

    setIsRunning(true);
    setResults([]);
    setOutput('');

    try {
      if (window.electron) {
        toast.info('Running tests...');

        // Try npm test first, fall back to other test runners
        const result = await window.electron.shell.exec('npm test 2>&1 || yarn test 2>&1 || echo "No test runner found"', currentProject.path);

        if (result.success && result.stdout) {
          setOutput(result.stdout);
          const parsedResults = parseTestOutput(result.stdout);

          if (parsedResults.length > 0) {
            setResults(parsedResults);
            const passed = parsedResults.filter(r => r.status === 'pass').length;
            const failed = parsedResults.filter(r => r.status === 'fail').length;
            toast.success(`Tests complete: ${passed} passed, ${failed} failed`);
          } else {
            // No parseable results, show raw output
            toast.info('Tests completed. Check output for details.');
          }
        } else if (result.stderr) {
          setOutput(result.stderr);
          toast.error('Tests failed. Check output for details.');
        }
      } else {
        // Demo mode
        toast.info('Test execution requires Electron mode');
        setResults([
          { id: 'demo-1', name: 'Demo Test 1', status: 'pass', duration: 42 },
          { id: 'demo-2', name: 'Demo Test 2', status: 'pass', duration: 15 },
          { id: 'demo-3', name: 'Demo Test 3 (Demo Mode)', status: 'skip' },
        ]);
      }
    } catch (err) {
      logger.error('[Tests] Failed to run:', err);
      toast.error('Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  }, [currentProject, parseTestOutput]);

  return (
    <div className="screen tests">
      <QuickActions />

      <div className="tests-content">
        <div className="tests-header">
          <div className="tests-summary">
            <div className="tests-stat pass">
              <span className="tests-stat-value">{passCount}</span>
              <span className="tests-stat-label">Passed</span>
            </div>
            <div className="tests-stat fail">
              <span className="tests-stat-value">{failCount}</span>
              <span className="tests-stat-label">Failed</span>
            </div>
            <div className="tests-stat skip">
              <span className="tests-stat-value">{skipCount}</span>
              <span className="tests-stat-label">Skipped</span>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={runTests}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Button>
        </div>

        {results.length === 0 && !output ? (
          <EmptyState
            icon="test"
            title="No test results"
            description="Run tests to see results here"
            action={{
              label: isRunning ? 'Running...' : 'Run all tests',
              onClick: runTests,
            }}
          />
        ) : (
          <>
            {results.length > 0 && (
              <div className="tests-results">
                <SectionTitle>Results</SectionTitle>
                {results.map(test => (
                  <div key={test.id} className={`test-item ${test.status}`}>
                    <span className="test-status">
                      {test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '○'}
                    </span>
                    <span className="test-name">{test.name}</span>
                    {test.duration && (
                      <Badge variant="info">{test.duration}ms</Badge>
                    )}
                    {test.error && (
                      <span className="test-error">{test.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {output && (
              <div className="tests-output">
                <SectionTitle>Output</SectionTitle>
                <pre className="tests-output-content">{output}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
