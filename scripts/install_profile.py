"""Read-only installation preflight. Configuration changes are explicit and guarded."""
import os,json
from pathlib import Path
from qq_compat import migrate
if __name__=='__main__':
    profile=Path(os.environ['USERPROFILE'])/'.dsh/profiles/desktop'
    print(json.dumps(migrate(profile),indent=2))
    print('No files changed. Review qq_compat.py plan and use --apply --expected-sha256 HASH explicitly.')
