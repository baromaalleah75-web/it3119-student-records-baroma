import './style.css'
import { supabase } from './supabaseClient.js'

const loginForm = document.querySelector('#login')
const emailInput = document.querySelector('#email')
const passwordInput = document.querySelector('#password')
const registerButton = document.querySelector('#register')
const logoutButton = document.querySelector('#logout')
const authMessage = document.querySelector('#auth-message')
const app = document.querySelector('#app')
const currentUser = document.querySelector('#current-user')
const studentForm = document.querySelector('#student-form')
const studentIdInput = document.querySelector('#student-id')
const studentNoInput = document.querySelector('#student-no')
const firstNameInput = document.querySelector('#first-name')
const lastNameInput = document.querySelector('#last-name')
const yearInput = document.querySelector('#year')
const studentEmailInput = document.querySelector('#student-email')
const courseSelect = document.querySelector('#course')
const formTitle = document.querySelector('#form-title')
const saveStudentButton = document.querySelector('#save-student')
const clearButton = document.querySelector('#clear')
const message = document.querySelector('#message')
const searchInput = document.querySelector('#search')
const refreshButton = document.querySelector('#refresh')
const studentList = document.querySelector('#list')
const countButton = document.querySelector('#count')
const report = document.querySelector('#report')

let courses = []
let students = []
let activeUserId = null

function setMessage(element, text) {
  element.textContent = text
}

function errorText(error, fallback) {
  return error && typeof error.message === 'string' ? error.message : fallback
}

function setLoginButtonsDisabled(disabled) {
  loginForm.querySelectorAll('button').forEach((button) => {
    button.disabled = disabled
  })
}

function renderCourses() {
  const selectedCourse = courseSelect.value
  const options = courses.map((course) => {
    const option = document.createElement('option')
    option.value = String(course.course_id)
    option.textContent = [course.course_code, course.course_name].filter(Boolean).join(' - ')
    return option
  })

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = courses.length ? 'Select a course' : 'No courses available'
  courseSelect.replaceChildren(placeholder, ...options)

  if (courses.some((course) => String(course.course_id) === selectedCourse)) {
    courseSelect.value = selectedCourse
  }
}

function courseName(courseId) {
  const course = courses.find((item) => String(item.course_id) === String(courseId))
  if (!course) return 'Course unavailable'
  return [course.course_code, course.course_name].filter(Boolean).join(' - ')
}

function renderStudents() {
  const query = searchInput.value.trim().toLocaleLowerCase()
  const visibleStudents = students.filter((student) => {
    const searchable = `${student.student_no} ${student.first_name} ${student.last_name}`
    return searchable.toLocaleLowerCase().includes(query)
  })

  studentList.replaceChildren()

  if (!visibleStudents.length) {
    const emptyMessage = document.createElement('li')
    emptyMessage.className = 'empty-state'
    emptyMessage.textContent = query ? 'No matching students found.' : 'No student records yet.'
    studentList.append(emptyMessage)
    return
  }

  visibleStudents.forEach((student) => {
    const item = document.createElement('li')
    item.className = 'student-row'

    const details = document.createElement('div')
    details.className = 'student-details'

    const name = document.createElement('strong')
    name.textContent = `${student.first_name} ${student.last_name}`

    const number = document.createElement('span')
    number.className = 'student-number'
    number.textContent = student.student_no

    const summary = document.createElement('span')
    summary.className = 'student-summary'
    summary.textContent = `Year ${student.year_level} · ${courseName(student.course_id)} · ${student.email}`

    details.append(name, number, summary)

    const actions = document.createElement('div')
    actions.className = 'student-actions'

    const editButton = document.createElement('button')
    editButton.type = 'button'
    editButton.className = 'button-secondary'
    editButton.textContent = 'Edit'
    editButton.addEventListener('click', () => editStudent(student))

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.className = 'button-danger'
    deleteButton.textContent = 'Delete'
    deleteButton.addEventListener('click', () => deleteStudent(student))

    actions.append(editButton, deleteButton)
    item.append(details, actions)
    studentList.append(item)
  })
}

function resetStudentForm() {
  studentForm.reset()
  studentIdInput.value = ''
  formTitle.textContent = 'Add a student'
  saveStudentButton.textContent = 'Save student'
  setMessage(message, '')
}

function editStudent(student) {
  studentIdInput.value = String(student.student_id)
  studentNoInput.value = student.student_no
  firstNameInput.value = student.first_name
  lastNameInput.value = student.last_name
  yearInput.value = String(student.year_level)
  studentEmailInput.value = student.email
  courseSelect.value = String(student.course_id)
  formTitle.textContent = 'Edit student'
  saveStudentButton.textContent = 'Update student'
  setMessage(message, '')
  studentForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadRecords(successMessage = '') {
  setMessage(message, 'Loading student records…')
  studentList.replaceChildren()

  try {
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('course_id, course_code, course_name')
      .order('course_code')

    if (courseError) throw courseError

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('student_id, student_no, first_name, last_name, year_level, email, course_id, updated_at')
      .order('last_name')
      .order('first_name')

    if (studentError) throw studentError

    courses = courseData ?? []
    students = studentData ?? []
    renderCourses()
    renderStudents()
    setMessage(
      message,
      courses.length
        ? successMessage
        : 'No courses found. Add courses to the courses table in Supabase first.',
    )
  } catch (error) {
    setMessage(message, `Could not load records: ${errorText(error, 'Unknown database error')}`)
    studentList.replaceChildren()
  }
}

async function editOrAddStudent(event) {
  event.preventDefault()
  if (!supabase) return

  saveStudentButton.disabled = true
  setMessage(message, 'Saving student…')

  const record = {
    student_no: studentNoInput.value.trim(),
    first_name: firstNameInput.value.trim(),
    last_name: lastNameInput.value.trim(),
    year_level: Number(yearInput.value),
    email: studentEmailInput.value.trim(),
    course_id: courseSelect.value,
    updated_at: new Date().toISOString(),
  }

  try {
    const isUpdate = Boolean(studentIdInput.value)
    const result = isUpdate
      ? await supabase
        .from('students')
        .update(record)
        .eq('student_id', studentIdInput.value)
      : await supabase.from('students').insert(record)

    if (result.error) throw result.error

    resetStudentForm()
    await loadRecords(isUpdate ? 'Student updated.' : 'Student saved.')
  } catch (error) {
    setMessage(message, `Could not save student: ${errorText(error, 'Unknown database error')}`)
  } finally {
    saveStudentButton.disabled = false
  }
}

async function deleteStudent(student) {
  if (!supabase) return
  const fullName = `${student.first_name} ${student.last_name}`
  if (!window.confirm(`Delete the record for ${fullName}? This cannot be undone.`)) return

  setMessage(message, 'Deleting student…')
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('student_id', student.student_id)

    if (error) throw error

    if (studentIdInput.value === String(student.student_id)) resetStudentForm()
    await loadRecords('Student deleted.')
  } catch (error) {
    setMessage(message, `Could not delete student: ${errorText(error, 'Unknown database error')}`)
  }
}

async function countCourseStudents() {
  if (!supabase) return
  if (!courseSelect.value) {
    setMessage(report, 'Choose a course in the student form first.')
    return
  }

  countButton.disabled = true
  setMessage(report, 'Counting students…')

  try {
    const { count, error } = await supabase
      .from('students')
      .select('student_id', { count: 'exact', head: true })
      .eq('course_id', courseSelect.value)

    if (error) throw error
    setMessage(report, `${count ?? 0} student(s) in ${courseName(courseSelect.value)}.`)
  } catch (error) {
    setMessage(report, `Could not count students: ${errorText(error, 'Unknown database error')}`)
  } finally {
    countButton.disabled = false
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (!supabase) return

  setMessage(authMessage, 'Signing in…')
  setLoginButtonsDisabled(true)
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    })
    if (error) throw error
    setMessage(authMessage, '')
  } catch (error) {
    setMessage(authMessage, `Sign-in failed: ${errorText(error, 'Please try again.')}`)
  } finally {
    setLoginButtonsDisabled(false)
  }
})

registerButton.addEventListener('click', async () => {
  if (!supabase) return

  setMessage(authMessage, 'Creating account…')
  setLoginButtonsDisabled(true)
  try {
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    })
    if (error) throw error

    setMessage(
      authMessage,
      data.session
        ? ''
        : 'Registration submitted. Check your email to confirm your account, then sign in.',
    )
  } catch (error) {
    setMessage(authMessage, `Registration failed: ${errorText(error, 'Please try again.')}`)
  } finally {
    setLoginButtonsDisabled(false)
  }
})

logoutButton.addEventListener('click', async () => {
  if (!supabase) return

  logoutButton.disabled = true
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    setMessage(authMessage, `Sign-out failed: ${errorText(error, 'Please try again.')}`)
  } finally {
    logoutButton.disabled = false
  }
})

studentForm.addEventListener('submit', editOrAddStudent)
clearButton.addEventListener('click', resetStudentForm)
searchInput.addEventListener('input', renderStudents)
refreshButton.addEventListener('click', loadRecords)
countButton.addEventListener('click', countCourseStudents)

if (!supabase) {
  setMessage(
    authMessage,
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.',
  )
  setLoginButtonsDisabled(true)
} else {
  supabase.auth.onAuthStateChange((_event, session) => {
    loginForm.hidden = Boolean(session)
    app.hidden = !session
    currentUser.textContent = session ? `Signed in as ${session.user.email}` : ''

    if (!session) {
      activeUserId = null
      courses = []
      students = []
      resetStudentForm()
      renderCourses()
      renderStudents()
      return
    }

    if (activeUserId !== session.user.id) {
      activeUserId = session.user.id
      window.setTimeout(() => {
        if (activeUserId === session.user.id) loadRecords()
      }, 0)
    }
  })
}
