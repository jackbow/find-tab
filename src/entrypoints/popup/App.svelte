<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import browser from 'webextension-polyfill';
  import { formatDistanceToNow } from 'date-fns';
  import Icon from '~/lib/Icon.svelte';
  const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
  let tabs: browser.Tabs.Tab[] = $state([]);
  let recentlyClosedTabs: browser.Tabs.Tab[] = $state([]);
  const tabSieve = (tab: browser.Tabs.Tab) => (isSafari ? !!tab.title && !!tab.url : true) && ((tab.title ?? '').toLowerCase().includes(search.toLowerCase()) || 
    (tab.url ?? '').toLowerCase().includes(search.toLowerCase()));
  let filteredTabs: browser.Tabs.Tab[] = $derived(tabs.filter(tabSieve));
  let filteredRecentlyClosedTabs: browser.Tabs.Tab[] = $derived(recentlyClosedTabs.filter(tabSieve));
  const openTabCount = $derived(filteredTabs.length - filteredRecentlyClosedTabs.length);
  let prevFilteredTabsLength = $state(filteredTabs.length);
  let selectedTab: browser.Tabs.Tab | undefined = $state(undefined);
  let search = $state('');
  let selectedIndex = $state(0);
  let hoveredTabID: number | undefined = $state(undefined);
  onMount(async () => {
    recentlyClosedTabs = isSafari
      ? []
      : (await browser?.sessions?.getRecentlyClosed({ maxResults: 10 }))
          ?.map((session) => session.tab)
          ?.filter((t) => !!t);
    const currentTabID = (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    tabs = (await browser.tabs.query({}))
      .sort((a, b) => {
        if (a.id === currentTabID) return 1;
        if (b.id === currentTabID) return -1;
        return (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0);
      })
      .concat(recentlyClosedTabs);
    selectedTab = tabs?.[0];
  });
  const chooseTab = (params: { tabID?: number; sessionID?: string; windowID?: number }) => {
    const { tabID, sessionID, windowID } = params;
    if (tabID) {
      browser.tabs.update(tabID, { active: true });
      if (windowID) browser.windows.update(windowID, { focused: true });
    } else if (!isSafari && sessionID) browser?.sessions?.restore(sessionID);
    window.close();
  };

  document.addEventListener('keydown', (e) => {
    const isFirefox = navigator.userAgent.includes('Firefox');
    const modifierKey = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
    if (modifierKey) {
      if (e.key === 'd') {
        e.preventDefault();
        if (e.shiftKey) {
          const tabIDs = new Set(filteredTabs.map(tab => tab.id));
          browser.tabs.remove(filteredTabs.map(tab=>tab.id).filter(id => id !== undefined));
          tabs = tabs.filter((tab) => !tabIDs.has(tab.id));
          search = '';
        } else if (selectedTab?.id) {
          tabs = tabs.filter((tab) => tab.id !== selectedTab?.id);
          browser.tabs.remove(selectedTab.id)
        }
      }
      if (isFirefox && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          browser.tabs.discard(filteredTabs.map(tab=>tab.id).filter(id => id !== undefined));
          for (const tab of filteredTabs) {
            tab.discarded = true;
          }
        } else if (selectedTab?.id) {
          browser.tabs.discard(selectedTab.id)
          selectedTab.discarded = true
        }
      }
    }
    switch (e.key) {
      case 'ArrowUp':
        selectedIndex = selectedIndex === 0 ? filteredTabs.length - 1 : selectedIndex - 1;
        selectedTab = filteredTabs?.[selectedIndex];
        break;
      case 'ArrowDown':
        selectedIndex = selectedIndex === filteredTabs.length - 1 ? 0 : selectedIndex + 1;
        selectedTab = filteredTabs?.[selectedIndex];
        break;
      case 'Enter':
        chooseTab({ tabID: selectedTab?.id, sessionID: selectedTab?.sessionId, windowID: selectedTab?.windowId });
        break;
      case 'Escape':
        window.close();
        break;
    }
  });
  $effect(() => {
    if (search.length > 0 && prevFilteredTabsLength !== filteredTabs.length) {
      selectedIndex = 0;
      selectedTab = filteredTabs?.[selectedIndex];
      prevFilteredTabsLength = filteredTabs.length;
    }
  });
  const getSearchParts = (str: string, substr: string) => {
    const idx = str.toLocaleLowerCase().indexOf(substr);
    return [str.slice(0, idx), str.slice(idx, idx + substr.length), str.slice(idx + substr.length)];
  };
  const titleResultIDs = $derived(new Set(filteredTabs.map((tab) => tab.id)));
</script>

<main class="w-80">
  <span class="flex items-center pr-2">
    <input
      autocomplete="off"
      type="text"
      bind:value={search}
      autofocus
      placeholder="Search"
      class="w-full focus:ring-0 ring-offset-0 border-transparent focus:border-transparent outline-none p-2"
    />
    {#if !search}
      <p class="text-gray-500">⇧⌘E</p>
    {/if}
  </span>
  {#if filteredTabs.length === 0}
    <p class="p-2 text-gray-400">No results found</p>
  {/if}
  {#if tabs.length > 0}
    <ul class="border-t border-gray-200 dark:border-gray-700">
      {#each filteredTabs as tab, i}
        {#if i === openTabCount}
          <li class="text-gray-500 text-sm px-4 py-1">Recently closed</li>
        {/if}
        <li class:opacity-70={i < openTabCount && (tab?.discarded ?? false)}>
          <button
            class={{
              ['cursor-pointer w-full px-4 p-1 flex items-center justify-between']: true,
              ['bg-gray-100 dark:bg-stone-800']: selectedTab?.id === tab?.id,
            }}
            onmouseenter={() => (hoveredTabID = tab.id)}
            onmouseleave={() => (hoveredTabID = undefined)}
            onclick={() => {
              chooseTab({ tabID: tab.id, sessionID: tab.sessionId, windowID: tab.windowId });
            }}
          >
            <span class="flex items-center place-self-start truncate space-x-4">
              <div class="h-4 w-4 max-w-4 min-w-4">
                {#if tab.favIconUrl}
                  <img src={tab.favIconUrl} alt="favicon" />
                {:else if tab?.url && ['https', 'http'].includes(tab.url.split('://')[0])}
                  <!-- src={'http://www.google.com/s2/favicons?sz=64&domain=' + new URL(tab.url).hostname} -->
                  <img src={'https://icons.duckduckgo.com/ip3/' + new URL(tab.url).hostname + '.ico'} alt="favicon" />
                {:else}
                  <Icon name="earth" height={18} width={18} />
                {/if}
              </div>
              <div class="flex flex-col items-start">
                <span class="overflow-ellipsis overflow-hidden text-[.8rem]">
                  {#if titleResultIDs.has(tab.id)}
                    {#each getSearchParts(tab?.title ?? '', search) as part, i (i)}
                      {#if i % 2 == 0}
                        <p class="inline">{part}</p>
                      {:else}
                        <p class="inline font-bold dark:bg-amber-900">{part}</p>
                      {/if}
                    {/each}
                  {:else}
                    <p>{tab.title || tab.url}</p>
                  {/if}
                </span>
                <div class="flex opacity-60 text-xs">
                  {#if tab.url && tab.url.includes('://')}
                    {tab.url.split('://')[1].split('/')[0]}
                    {#if i < openTabCount}
                      •
                    {/if}
                  {/if}
                  {#if i < openTabCount}
                    {formatDistanceToNow(tab.lastAccessed ?? new Date(), { addSuffix: true })}
                  {/if}
                </div>
              </div>
            </span>
            {#if hoveredTabID === tab.id && i < openTabCount}
              <button
                class="h-4 w-4 cursor-pointer hover:text-red-500 duration-150"
                onclick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  tabs = tabs.filter((t) => t.id !== tab.id);
                  if (tab.id) await browser.tabs.remove(tab.id);
                  recentlyClosedTabs = isSafari
                    ? []
                    : (await browser?.sessions?.getRecentlyClosed({ maxResults: 10 }))
                        ?.map((session) => session.tab)
                        ?.filter((t) => !!t);
                  if (recentlyClosedTabs.length > 0) tabs.push(recentlyClosedTabs[0]);
                }}
              >
                <Icon name="close" height={18} width={18} />
              </button>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="p-2">Error loading tabs</p>
  {/if}
</main>

<style>
  @media (prefers-color-scheme: dark) {
    :root {
      background-color: #121212;
      color: rgba(255, 255, 255, 0.87);
    }
  }
  li:last-child > button {
    padding-bottom: calc(var(--spacing) * 2) /* 0.5rem = 8px */;
  }
</style>
