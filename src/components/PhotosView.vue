<template>
  <div class="card p-3 p-md-4">
    <h4>Trip Photos</h4>
    <p class="text-muted small">Add photos and captions for this trip. Photos stay while you switch tabs, but clear when you refresh or leave this trip.</p>

    <form class="d-flex gap-2 mb-3" @submit.prevent="createAlbum">
      <label for="new-album" class="visually-hidden">New album name</label>
      <input id="new-album" v-model="newAlbumName" class="form-control" placeholder="New album name" maxlength="60" required>
      <button class="btn btn-outline-primary text-nowrap" type="submit">Create album</button>
    </form>
    <div class="d-flex flex-wrap gap-2 mb-3" aria-label="Photo albums">
      <button v-for="album in albums" :key="album.id" type="button" class="btn btn-sm"
        :class="selectedAlbumId === album.id ? 'btn-primary' : 'btn-outline-secondary'"
        :aria-pressed="selectedAlbumId === album.id" @click="selectedAlbumId = album.id">
        {{ album.name }} ({{ photos.filter(photo => photo.albumId === album.id).length }})
      </button>
    </div>
    <h5>{{ selectedAlbum.name }}</h5>
    <p class="small text-muted">Selected photos will be added to this album.</p>
    <label for="trip-photos" class="form-label">Choose photos</label>
    <input id="trip-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
      class="form-control mb-2" @change="addPhotos">
    <p class="text-muted small">JPEG, PNG or WebP · up to 5 MB each · up to 20 photos across all albums</p>
    <p v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>
    <p v-if="albumPhotos.length === 0" class="text-muted">No photos in this album yet.</p>

    <div class="row">
      <div v-for="photo in albumPhotos" :key="photo.id" class="col-sm-6 col-lg-4 mb-3">
        <div class="card h-100">
          <img :src="photo.url" :alt="photo.caption || photo.name" class="photo-preview card-img-top">
          <div class="card-body">
            <p class="small text-muted text-break">{{ photo.name }}</p>
            <label :for="'photo-caption-' + photo.id" class="form-label">Caption</label>
            <input :id="'photo-caption-' + photo.id" v-model="photo.caption" maxlength="300"
              class="form-control mb-3" placeholder="What happened here?">
            <label :for="'photo-album-' + photo.id" class="form-label">Album</label>
            <select :id="'photo-album-' + photo.id" v-model="photo.albumId" class="form-select mb-3">
              <option v-for="album in albums" :key="album.id" :value="album.id">{{ album.name }}</option>
            </select>
            <div class="d-flex gap-2">
              <a :href="photo.url" :download="photo.name" class="btn btn-outline-primary btn-sm">Download</a>
              <button type="button" class="btn btn-outline-danger btn-sm" @click="removePhoto(photo.id)">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      albums: [{ id: 1, name: 'General' }],
      selectedAlbumId: 1,
      nextAlbumId: 2,
      newAlbumName: '',
      photos: [],
      nextPhotoId: 1,
      errorMessage: ''
    }
  },
  computed: {
    selectedAlbum() {
      return this.albums.find(album => album.id === this.selectedAlbumId)
    },
    albumPhotos() {
      return this.photos.filter(photo => photo.albumId === this.selectedAlbumId)
    }
  },
  beforeUnmount() {
    // Release preview URLs when leaving the trip.
    for (const photo of this.photos) URL.revokeObjectURL(photo.url)
  },
  methods: {
    createAlbum() {
      const name = this.newAlbumName.trim()
      if (!name) return
      if (this.albums.some(album => album.name.toLowerCase() === name.toLowerCase())) {
        this.errorMessage = 'An album with this name already exists.'
        return
      }
      const album = { id: this.nextAlbumId++, name }
      this.albums.push(album)
      this.selectedAlbumId = album.id
      this.newAlbumName = ''
      this.errorMessage = ''
    },
    addPhotos(event) {
      const errors = []
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

      for (const file of event.target.files) {
        if (!allowedTypes.includes(file.type)) {
          errors.push(file.name + ': choose a JPEG, PNG or WebP image.')
        } else if (file.size > 5 * 1024 * 1024) {
          errors.push(file.name + ': image is larger than 5 MB.')
        } else if (this.photos.length >= 20) {
          errors.push('You can add up to 20 photos.')
          break
        } else {
          this.photos.push({
            id: this.nextPhotoId++,
            name: file.name,
            albumId: this.selectedAlbumId,
            url: URL.createObjectURL(file),
            caption: ''
          })
        }
      }

      this.errorMessage = errors.join(' ')
      event.target.value = ''
    },
    removePhoto(id) {
      const photo = this.photos.find(photo => photo.id === id)
      if (photo) URL.revokeObjectURL(photo.url)
      this.photos = this.photos.filter(photo => photo.id !== id)
    }
  }
}
</script>

<style scoped>
.photo-preview {
  height: 200px;
  object-fit: cover;
}
</style>
