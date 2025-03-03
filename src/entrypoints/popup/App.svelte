<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import browser from 'webextension-polyfill';
  import { formatDistanceToNow, format } from 'date-fns';

  import Icon from '~/lib/Icon.svelte';
  let tabs: browser.Tabs.Tab[] = $state([]);
  let filteredTabs: browser.Tabs.Tab[] = $derived(
    tabs.filter((tab) => (tab.title ?? '').toLowerCase().includes(search.toLowerCase()))
  );
  let prevFilteredTabsLength = $state(filteredTabs.length);
  let selectedTabID: number | undefined = $state(undefined);
  let search = $state('');
  let selectedIndex = $state(0);
  let hoveredTabID: number | undefined = $state(undefined);
  onMount(async () => {
    tabs = await browser.tabs.query({});
    selectedTabID = tabs?.[0]?.id;
  });
  const switchToTabID = (tabID: number | undefined) => {
    if (tabID) {
      chrome.tabs.update(tabID, { active: true });
    }
  };
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
        selectedIndex = selectedIndex === 0 ? filteredTabs.length - 1 : selectedIndex - 1;
        selectedTabID = filteredTabs?.[selectedIndex]?.id;
        break;
      case 'ArrowDown':
        selectedIndex = selectedIndex === filteredTabs.length - 1 ? 0 : selectedIndex + 1;
        selectedTabID = filteredTabs?.[selectedIndex]?.id;
        break;
      case 'Enter':
        switchToTabID(selectedTabID);
        window.close();
        break;
      case 'Escape':
        window.close();
        break;
    }
  });
  $effect(() => {
    if (prevFilteredTabsLength !== filteredTabs.length) {
      selectedIndex = 0;
      selectedTabID = filteredTabs?.[selectedIndex]?.id;
      prevFilteredTabsLength = filteredTabs.length;
    }
  });
  const getSearchParts = (str: string, substr: string) => {
    const idx = str.toLocaleLowerCase().indexOf(substr);
    return [str.slice(0, idx), str.slice(idx, idx + substr.length), str.slice(idx + substr.length)];
  };
  const titleResultIDs = $derived(new Set(filteredTabs.map((tab) => tab.id)));
</script>

<!-- "Search                           ⇧⌘E" -->
<main class="w-80">
  {tabs.length}{selectedTabID}
  <span class="flex items-center pr-2">
    <input
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
  {#if tabs.length > 0}
    <ul class="border-t border-gray-200 dark:border-gray-700">
      {#each filteredTabs as tab}
        <li>
          <button
            class={{
              ['cursor-pointer w-full px-2 p-1 flex items-center justify-between']: true,
              ['bg-gray-100 dark:bg-stone-800']: selectedTabID === tab.id,
            }}
            onmouseenter={() => (hoveredTabID = tab.id)}
            onmouseleave={() => (hoveredTabID = undefined)}
            onclick={() => switchToTabID(tab.id)}
          >
            <!-- <button class="cursor-pointer" onclick={() => switchToTabID(tab.id)}> -->
            <span class="flex items-center place-self-start truncate">
              <!-- highlight the part of the tab.title that contains the search term -->
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
              <div class="flex flex-col">
                <span class="overflow-ellipsis overflow-hidden px-2 rounded-sm">
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
                <div class="flex">
                  {tab.url && tab.url.split('://')[1].split('/')[0]}
                  •
                  <!-- convert tab.lastaccessed to n seconds ago, etc -->
                  {formatDistanceToNow(tab.lastAccessed ?? new Date(), { addSuffix: true })}
                </div>
              </div>
            </span>
            <!-- </button> -->
            {#if hoveredTabID === tab.id}
              <button
                class="h-4 w-4 cursor-pointer hover:text-red-500 duration-150"
                onclick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (tab.id) await browser.tabs.remove(tab.id);
                  tabs = tabs.filter((t) => t.id !== tab.id);
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
  /* detect dark mode */
  @media (prefers-color-scheme: dark) {
    :root {
      background-color: #121212;
      color: rgba(255, 255, 255, 0.87);
    }
  }
</style>
