// Integration test: PhotosView + its child components + the real server.
// Needs the server running and a test account: see playwright.config.js
// Run: pnpm exec vitest run tests/lam/integration
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PhotosView from '../../../src/components/trip/PhotosView.vue'
import { logIn, createTrip, getTrip, deleteTrip, waitFor, axios } from './api.js'

// A real 1x1 PNG image
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))

let trip

beforeAll(async () => {
  // jsdom (the fake browser Vitest uses) has no URL.createObjectURL, which the photo previews need
  URL.createObjectURL = () => 'blob:preview'
  URL.revokeObjectURL = () => {}
  await logIn()
  trip = await createTrip({ name: 'Photo test trip' })
})

afterAll(async () => {
  await deleteTrip(trip.id) // (its photos go with it)
})

const photosUrl = () => '/api/trips/' + trip.id + '/photos'

// Upload straight to the server (the browser makes the thumbnail, which jsdom can't draw)
async function uploadPhoto(name = 'temple.png') {
  const res = await axios.post(photosUrl(), new Blob([PNG], { type: 'image/png' }), { params: { name }, headers: { 'Content-Type': 'image/png' } })
  return res.data
}

async function serverPhotos() {
  return (await axios.get(photosUrl())).data
}

async function mountPhotos() {
  const wrapper = mount(PhotosView, { props: { tripId: trip.id, me: trip.me, wishlist: [{ name: 'Fushimi Inari' }] } })
  await waitFor(() => !wrapper.vm.loading) // the photos have arrived from the server
  return wrapper
}

async function pickFiles(wrapper, files) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  await flushPromises()
}

// "+ Add album", type a name, Create, and wait for the form to close (it closes once the album is saved)
async function addAlbum(wrapper, name) {
  await wrapper.find('.ph-pill-add').trigger('click')
  await wrapper.find('#ph-album-name').setValue(name)
  await wrapper.find('.ph-newalbum').trigger('submit')
  await waitFor(() => !wrapper.find('.ph-newalbum').exists())
}

describe('PhotosView with the server', () => {
  it("shows the trip's photos, added as the logged-in member", async () => {
    const photo = await uploadPhoto()
    expect(photo.uploadedBy).toBe(trip.me) // the server decides who added it

    const wrapper = await mountPhotos()
    expect(wrapper.text()).toContain('1 photo')
    expect(wrapper.find('img[alt="Photo by ' + trip.me + '"]').exists()).toBe(true)
  })

  it('saves a reaction, and takes it back on a second tap', async () => {
    const wrapper = await mountPhotos()
    const heart = wrapper.findAll('.ph-react').find((b) => b.text().startsWith('❤️'))

    const hearts = async () => (await serverPhotos())[0].reactions['❤️']

    await heart.trigger('click')
    await waitFor(async () => !!(await hearts()))
    expect(await hearts()).toEqual([trip.me])

    await heart.trigger('click')
    await waitFor(async () => !(await hearts()))
    expect(await hearts()).toBeUndefined()
  })

  it('saves a new spot album on the trip', async () => {
    const wrapper = await mountPhotos()
    await addAlbum(wrapper, 'Nishiki Market')
    const albums = (await getTrip(trip.id)).photoAlbums
    expect(albums.map((a) => a.name)).toContain('Nishiki Market')
  })

  it('does not make a second album with the same name in different capitals', async () => {
    const wrapper = await mountPhotos()
    await addAlbum(wrapper, 'Arashiyama')
    await addAlbum(wrapper, 'ARASHIYAMA')
    const names = (await getTrip(trip.id)).photoAlbums.map((a) => a.name.toLowerCase())
    expect(names.filter((n) => n === 'arashiyama')).toHaveLength(1)
  })

  it('does not create an album with a blank name', async () => {
    const wrapper = await mountPhotos()
    const before = (await getTrip(trip.id)).photoAlbums.length
    await wrapper.find('.ph-pill-add').trigger('click')
    await wrapper.find('#ph-album-name').setValue('   ')
    const create = wrapper.findAll('.ph-newalbum button').find((b) => b.text() === 'Create')
    expect(create.attributes('disabled')).toBeDefined()

    await wrapper.find('.ph-newalbum').trigger('submit') // even if the form is sent anyway
    await flushPromises()
    expect((await getTrip(trip.id)).photoAlbums).toHaveLength(before)
  })

  it('refuses files that are not photos or are too big, and uploads nothing', async () => {
    const before = (await serverPhotos()).length
    const wrapper = await mountPhotos()
    await pickFiles(wrapper, [
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
      new File(['heic'], 'IMG_0001.heic', { type: 'image/heic' }),
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' })
    ])
    const errors = wrapper.findAll('[role="alert"]').map((e) => e.text())
    expect(errors).toContain('notes.txt: Not a JPEG, PNG, WebP or GIF')
    expect(errors).toContain('IMG_0001.heic: HEIC photos are not supported, export as JPEG')
    expect(errors).toContain('huge.jpg: Bigger than 10 MB')
    expect(await serverPhotos()).toHaveLength(before)
  })

  it('deletes a photo for everyone after asking first', async () => {
    const wrapper = await mountPhotos()
    await wrapper.find('[aria-label="Open photo 1"]').trigger('click')
    // The photo viewer opens on top of the page (outside the component), so look for its buttons there
    const button = (text) => Array.from(document.querySelectorAll('.ph-lb button')).find((x) => x.textContent.trim() === text)
    await waitFor(() => button('Delete'))

    button('Delete').click()
    await waitFor(() => button('Delete for everyone'))
    expect(await serverPhotos()).toHaveLength(1) // only asked so far
    button('Delete for everyone').click()
    await waitFor(async () => (await serverPhotos()).length === 0)
    expect(await serverPhotos()).toHaveLength(0)
    expect(wrapper.text()).toContain('0 photos')
  })

  it('server refuses a non-image upload, an unknown reaction and an unknown photo', async () => {
    const text = axios.post(photosUrl(), 'not a photo', { headers: { 'Content-Type': 'text/plain' } })
    await expect(text).rejects.toMatchObject({ response: { status: 400 } })

    const photo = await uploadPhoto()
    const badEmoji = axios.post(photosUrl() + '/' + photo.id + '/react', { emoji: '💩' })
    await expect(badEmoji).rejects.toMatchObject({ response: { status: 400 } })

    const unknown = axios.delete(photosUrl() + '/000000000000000000000000')
    await expect(unknown).rejects.toMatchObject({ response: { status: 404 } })
  })
})
