<script lang="ts">
  import svelteLogo from '../../assets/svelte.svg';
  import Counter from '../../lib/Counter.svelte';
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      window.close();
    }
  });
</script>

<main>
  <p>hello world!</p>
</main>

<style>
</style>
