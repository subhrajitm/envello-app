import { Component, signal, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-editor.component.html',
  styleUrl: './profile-editor.component.css'
})
export class ProfileEditorComponent {
  private userService = inject(UserService);

  isOpen = signal(false);

  user = this.userService.user;
  userInitials = this.userService.userInitials;

  // Temp state for editing
  tempName = '';
  tempBio = '';
  tempAvatar: string | undefined = undefined;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  open() {
    const currentUser = this.user();
    if (currentUser) {
      this.tempName = currentUser.name;
      this.tempBio = currentUser.bio || '';
      this.tempAvatar = currentUser.avatar;
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        this.tempAvatar = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.tempAvatar = undefined;
  }

  save() {
    this.userService.updateProfile({
      name: this.tempName,
      bio: this.tempBio,
      avatar: this.tempAvatar
    });
    this.close();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
