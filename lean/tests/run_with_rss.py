"""Run a benchmark binary, stream stdout to a file, record wall time and peak RSS of the child."""
import subprocess, resource, sys, time
binary, out, limit = sys.argv[1], sys.argv[2], int(sys.argv[3])
t0 = time.time(); status = 'completed'
with open(out, 'w') as f:
    p = subprocess.Popen([binary], stdout=f)
    try: p.wait(timeout=limit)
    except subprocess.TimeoutExpired: p.kill(); p.wait(); status = f'stopped at time limit {limit}s'
ru = resource.getrusage(resource.RUSAGE_CHILDREN)
open(out + '.meta', 'w').write(f'status={status}\nwall_s={time.time() - t0:.1f}\npeak_rss_mb={ru.ru_maxrss / 1024:.1f}\ncpu_s={ru.ru_utime + ru.ru_stime:.1f}\n')
