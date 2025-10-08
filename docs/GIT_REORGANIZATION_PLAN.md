# Git Repository Reorganization Plan

## Current Issue
- Two git repositories for the same project
- Top-level repo: `/Hazards` (main branch, 1 commit, no development history)
- Nested repo: `/Hazards/hazards-app` (active development, multiple commits, real history)

## Recommended Solution: Keep hazards-app as primary

### Step 1: Backup everything
```powershell
# Create backup
cp -r "c:\Users\chris\Sites\Hazards" "c:\Users\chris\Sites\Hazards_BACKUP_$(Get-Date -Format 'yyyy-MM-dd')"
```

### Step 2: Move important top-level files into hazards-app
```powershell
cd "c:\Users\chris\Sites\Hazards"

# Move project-level files into hazards-app
mv "chat log.md" "hazards-app/"
mv "chat log b.md" "hazards-app/"
mv ".specstory" "hazards-app/"
mv "index.ts" "hazards-app/"
mv "supabase" "hazards-app/" # If different from hazards-app/supabase
```

### Step 3: Remove top-level git and move hazards-app up
```powershell
# Remove top-level git repo
rm -rf "c:\Users\chris\Sites\Hazards\.git"

# Move hazards-app contents up one level
cd "c:\Users\chris\Sites"
mv "Hazards\hazards-app" "Hazards_NEW"
rm -rf "Hazards"
mv "Hazards_NEW" "Hazards"
```

### Step 4: Clean up the git history
```powershell
cd "c:\Users\chris\Sites\Hazards"
git checkout main  # Switch to main branch
git branch -D debugging-fixing-things-for-registration-login  # Optional: clean up branch
```

## Alternative: Keep both but fix structure

If you want to keep project documentation separate:

### Restructure as monorepo
```
Hazards/ (git root)
├── .git/
├── .gitignore
├── README.md
├── docs/
│   ├── chat-logs/
│   └── .specstory/
├── app/ (renamed from hazards-app)
│   ├── src/
│   ├── package.json
│   └── ... (SvelteKit app)
└── infrastructure/
    └── supabase/
```