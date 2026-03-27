
$p = 'd:\Abaid\NoshVallet\style.css'
$content = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::Default)
$mark = "/* --- Ensure correct z-index for transaction table headers --- */"
$idx = $content.IndexOf($mark)
if ($idx -lt 0) {
    # If not found, fall back to just removing the very end if we see corrupted charset
    $mark = "}@charset"
    $idx = $content.IndexOf($mark)
}

if ($idx -ge 0) {
    $cleanPart = $content.Substring(0, $idx)
    $finalContent = $cleanPart + @"
.transactions-table thead th {
    z-index: 1;
}

/* --- Custom Dropdown Component --- */
.custom-dropdown {
    position: relative;
    user-select: none;
}

.dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--pure-white);
    border: 1.5px solid var(--gray-mid);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--primary-black);
    min-height: 44px;
}

.dropdown-trigger:hover {
    border-color: var(--primary-yellow);
    background: #fdfdfd;
}

.dropdown-trigger.active {
    border-color: var(--primary-yellow);
    box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.15);
}

.dropdown-trigger .selected-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dropdown-trigger .selected-text.text-muted {
    color: var(--text-muted);
    font-weight: 500;
}

.dropdown-trigger i {
    margin-left: 10px;
    font-size: 0.8rem;
    transition: transform 0.3s ease;
}

.dropdown-trigger.active i {
    transform: rotate(180deg);
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 100%;
    background: var(--pure-white);
    border: 1px solid var(--gray-mid);
    border-radius: 14px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    display: none;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    min-width: 200px;
    animation: dropdownFadeIn 0.2s ease;
}

.dropdown-menu.active {
    display: flex;
}

@keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
    padding: 12px 18px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 10px;
}

.dropdown-item:hover {
    background: var(--gray-bg);
    color: var(--primary-black);
}

.dropdown-item.active {
    background: rgba(255, 193, 7, 0.1);
    color: var(--primary-black);
    font-weight: 700;
}
"@
    [System.IO.File]::WriteAllText($p, $finalContent, [System.Text.Encoding]::UTF8)
    Write-Host "REPAIRED"
} else {
    Write-Host "COULD NOT FIND CORRUPTION MARKER"
}
